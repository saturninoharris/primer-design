import _ from 'lodash'
import { arrToObj, firebasePathExists, firebasePathAlreadyExists } from '../api'
import * as TYPES from './types'
import db from '../firebase/firebase'
import { getCurrentAuthorUid } from '../selectors/admin';

export const addExercise = (exerciseData = {}) => (dispatch, getState) => {
  // client knows we are updating
  dispatch({
    type: TYPES.ADD_EXERCISE_INIT,
    payload: exerciseData,
  })

  // firebase update
  return db.ref('exercises').push(exerciseData).then(snapshot => {
    const id = snapshot.key
    dispatch({
      type: TYPES.ADD_EXERCISE_SUCCESS,
      payload: exerciseData,
      id,
    })
  }).catch(err => {
    dispatch({
      type: TYPES.ADD_EXERCISE_FAIL,
      payload: { err, exerciseData }
    })
  })
}

export const updateExercise = (id, exerciseData) => (dispatch) => {
  dispatch({
    type: TYPES.UPDATE_EXERCISE_INIT,
    payload: exerciseData,
    id,
  })

  return db.ref(`exercises/${id}`).set(exerciseData).then(() => {
    dispatch({
      type: TYPES.UPDATE_EXERCISE_SUCCESS,
      payload: exerciseData,
      id,
    })
  }).catch(err => {
    dispatch({
      type: TYPES.UPDATE_EXERCISE_FAIL,
      payload: { err, exerciseData }
    })
  })
}

export const removeExercise = (id) => (dispatch) => {
  dispatch({
    type: TYPES.DELETE_EXERCISE_INIT,
    id
  })

  return db.ref(`exercises/${id}`).set(null).then(() => {
    dispatch({
      type: TYPES.DELETE_EXERCISE_SUCCESS,
      id,
    })
  }).catch((err) => {
    dispatch({
      type: TYPES.DELETE_EXERCISE_FAIL,
      id,
    })
  })
}

export const updateExerciseFilter = (text) => {
  return {
    type: TYPES.FILTER_EXERCISES_BY_TEXT,
    payload: text,
  }
}

export const updateSortBy = (val) => {
  return {
    type: TYPES.SORT_EXERCISES_BY,
    payload: val,
  }
}

export const updateShowOwnExercises = (payload) => ({
  type: TYPES.SHOW_LOGGED_IN_AUTHOR_EXERCISES_ONLY,
  payload,
})


// Author information
export const fetchAuthors = () => (dispatch) => {
  dispatch({
    type: TYPES.FETCH_AUTHORS_INIT
  })
  
  // db.ref('authors').on('value', (snapshot) => {
  //   const payload = snapshot.val()
  //   dispatch({
  //     type: TYPES.FETCH_AUTHORS_SUCCESS,
  //     payload,
  //   })
  // })

  return db.ref('authors').once('value', (snapshot) => {
    const payload = snapshot.val()
    dispatch({
      type: TYPES.FETCH_AUTHORS_SUCCESS,
      payload,
    })
  })
}

export const updateAuthorName = (uid, fullName) => (dispatch) => {
  return db.ref(`authors/${uid}`).update({ fullName })
  .then(() => {
    dispatch({
      type: TYPES.UPDATE_AUTHOR_NAME,
      uid,
      fullName,
    })
  }).catch((err) => {
    dispatch({
      type: TYPES.UPDATE_AUTHOR_NAME_FAIL
    })
  })
}
/*
  * @param {object} summary - The current summary object of a cohort, exercise, or student.
  * @param {object} totalPopulation - The total number of: students (for cohorts or exercises) or exercises (for students)
  * @param {object} createAttmptsToo - If summary contains attempts, count them and order them
  * @return {object} summary - New summary containing
*/
const createSummary = (summary = {}, totalPopulation = 0, createAttemptsToo = true) => {
  // Get completed, unfinished, and notStarted counts
  const completedCount = summary.completedCount || 0
  const unfinishedCount = summary.unfinishedCount || 0
  const notStartedCount = totalPopulation - (completedCount + unfinishedCount)
  const newSummary = { completedCount, unfinishedCount, notStartedCount }
  
  // from attemptsCount object (as defined by database), create array of [attempt_id, count] inside summary
  if (createAttemptsToo) {
    const attemptsCountObj = summary.attemptsCount || {}
    newSummary.attemptsCount = [...Object.entries(attemptsCountObj).sort((a, b) => a - b)]
  }
  
  return newSummary
}
const createCohortSummary = (cohort, createAttemptsToo) => {
  return createSummary(cohort.summary, _.size(cohort.studentIDs), createAttemptsToo)
}
const createStudentSummary = (student, createAttemptsToo) => {
  return createSummary(student.summary, 10, createAttemptsToo)
}
// TODO: do the same with exercises

export const fetchCohorts = () => (dispatch) => {
  dispatch({ type: TYPES.FETCH_COHORTS_INIT })

  return db.ref('cohorts').once('value', (snapshot) => {
    const cohorts = 
      _.mapValues(snapshot.val(), cohort => ({...cohort, summary: createCohortSummary(cohort) }))
    
    // convert attempts to array of [ATTEMPT_ID, COUNT] and order them by attempts
    dispatch({
      type: TYPES.FETCH_COHORTS_SUCCESS,
      payload: cohorts,
    })
  })
}

export const fetchCohort = (id) => (dispatch) => {
  console.log('fetching cohort')
  dispatch({ type: TYPES.FETCH_COHORT_INIT })

  return db.ref(`cohorts/${id}`).once('value')
  .then((snapshot) => {
    const cohort = snapshot.val()
    cohort.summary = createCohortSummary(cohort)
    dispatch({
      type: TYPES.FETCH_COHORT_SUCCESS,
      id: snapshot.key,
      payload: cohort,
    })
    return snapshot.val()
  })
}

// students array should be [{ studentID, fullName, etc...}]
export const addCohort = ({ exerciseIDs = [], students = [], cohortName = ''}) => (dispatch, getState) => {
  const authorID = getCurrentAuthorUid(getState())
  dispatch({ type: TYPES.ADD_COHORT_INIT })
  if(!cohortName) {
    dispatch({
      type: TYPES.ADD_COHORT_FAIL,
      err: 'No cohort name given',
    })
  }

  // check every student's ID doesnt exist before continuing, then return studentIDs object in promise for 'cohorts' path
  const studentsPromise = Promise.all(students.map(({studentID}) => firebasePathAlreadyExists(db, `students/${studentID}`)))
  .then(() => students.map( ({ studentID }) => studentID ))
  .then((data) => console.log(data) || data)
  .then((studentIDs) => arrToObj(studentIDs)) // { sedm4648: true, some5000: true }
  .then((data) => console.log(data) || data)
  .catch((err) => {
    dispatch({ type: TYPES.STUDENT_ALREADY_EXISTS, payload: err, })
    return Promise.reject(err)
  })
  
  // check every exercise exists before continuing
  const exercisesPromise = Promise.all(
    exerciseIDs.map((exerciseID) => firebasePathExists(db, `exercises/${exerciseID}`)))
  .then(() => arrToObj(exerciseIDs))
  .catch((err) => {
    dispatch({ type: TYPES.EXERCISE_DOESNT_EXIST, payload: err, })
    return Promise.reject(err)
  })

  // author exists
  const authorPromise = firebasePathExists(db, `authors/${authorID}`)

  // all good
  return Promise.all([studentsPromise, exercisesPromise, authorPromise]).then((data) => {
    let cohortID
    const [studentIDs, exerciseIDs] = data
    console.log('some stuff', studentIDs, exerciseIDs)
    // add cohort
    return db.ref('cohorts').push({ exerciseIDs, studentIDs, cohortName, authorID }).then((snapshot) => {
      cohortID = snapshot.key
      dispatch({
        type: TYPES.ADD_COHORT_SUCCESS,
        cohortID,
      })
      return cohortID // ignore students below, TODO: make addCohort more complete (being able to add exercises and students simultaneously)
      // add students
      const studentsObj = students.reduce((obj, { studentID, ...rest }) => ({ ...obj, [studentID]: { ...rest, cohortID } }), {})
      console.log(studentsObj)
      db.ref('students').update(studentsObj)
    })
  })
  .catch(err => {
    dispatch({
      type: TYPES.ADD_COHORT_FAIL,
      err,
    })
  })
}

export const removeCohort = (cohortID) => (dispatch) => {
  const removeStudents = () => db.ref(`cohorts/${cohortID}`).once('value')
    .then(snapshot => {
      const cohort = snapshot.val()
      return _.mapValues(cohort.studentIDs, () => null) // return object of { id1: null, id2: null, ... }
    })
    .then((studentIDs) => db.ref('students').update({ ...studentIDs })) // remove students

  dispatch({ type: TYPES.REMOVE_COHORT_INIT})
  // get all students associated with cohort and delete them first.

  return removeStudents()
    .then(() => db.ref(`cohorts/${cohortID}`).set(null)) // remove cohort
    .then(() => dispatch({ type: TYPES.REMOVE_COHORT_SUCCESS, cohortID }))
}

export const updateCohortName = (id, name) => (dispatch) => {
  dispatch({
    type: TYPES.UPDATE_COHORT_NAME_INIT,
    id,
    name,
  })
  db.ref(`cohorts/${id}`).update({ cohortName: name })
  .then(() => {
    dispatch({ 
      type: TYPES.UPDATE_COHORT_NAME_SUCCESS,
      id, 
      name,
    })
    dispatch({
      type: TYPES.FETCH_COHORT_SUCCESS,
      id,
      payload: {cohortName: name},
    })
  })
}


export const addExerciseToCohort = (cohortID, exerciseID) => (dispatch) => {
  dispatch({
    type: TYPES.ADD_COHORT_EXERCISE_INIT,
    cohortID,
    exerciseID,
  })
  return firebasePathExists(db, `exercises/${exerciseID}`).then(() => // check exercise exists
    db.ref(`cohorts/${cohortID}/exerciseIDs`).update({ [exerciseID]: true })) // add exercise to cohort
    .then(() => dispatch({
      type: TYPES.ADD_COHORT_EXERCISE_SUCCESS,
      cohortID, 
      exerciseID,
    }))
    .catch((err) => {
      return dispatch({
        type: 'EXERCISE DOES NOT EXIST',
        exerciseID,
        err
      })
    })
}

export const removeExerciseFromCohort = (cohortID, exerciseID) => (dispatch) => {
  dispatch({
    type: TYPES.REMOVE_COHORT_EXERCISE_INIT,
    cohortID,
    exerciseID,
  })
  console.log(`cohorts/${cohortID}/exerciseIDs/${exerciseID}`)
  return db.ref(`cohorts/${cohortID}/exerciseIDs/${exerciseID}`).set(null) // add exercise to cohort
    .then(() => dispatch({
      type: TYPES.REMOVE_COHORT_EXERCISE_SUCCESS,
      cohortID,
      exerciseID,
    }))
    .catch((err) => {
      return dispatch({
        type: 'EXERCISE DOES NOT EXIST',
        exerciseID,
        cohortID,
        err
      })
    })
}

// ids object usually given by cohort
export const fetchStudents = (ids = {}) => (dispatch) => {
  dispatch({
    type: TYPES.FETCH_STUDENTS_INIT,
    ids,
  })

  const studentIDs = _.keys(ids)
  return Promise.all(studentIDs.map(id => 
    db.ref(`students/${id}`).once('value').then((snapshot) => {
      return { [snapshot.key]: snapshot.val() } // return array of objects of { studentID: data }
    })
  )).then((data) => {
      data = data.map(student => ({...student, summary: createStudentSummary(student)}))
    dispatch({
      type: TYPES.FETCH_STUDENTS_SUCCESS,
      payload: data.reduce((obj, curr) => ({...obj, ...curr}), {})
    })
  })
    
    
  //   const payload = snapshot.val()
  //   dispatch({
  //     type: TYPES.FETCH_STUDENTS_SUCCESS,
  //     payload,
  //   })
  // })
}

export const addStudent = (cohortID, authorID, studentID, fullName) => (dispatch) => {
  dispatch({
    type: TYPES.ADD_STUDENT_INIT,
    studentID,
    fullName,
    cohortID,
    authorID,
  })
  // check if student doesn't already exist
  const createdAt = Date.now()
  return firebasePathAlreadyExists(db, `students/${studentID}`)
  .then(() => firebasePathExists(db, `cohorts/${cohortID}`)) // a student must be added to a cohort
  .then(() => db.ref('students').update({ [studentID]: { cohortID, authorID, fullName, createdAt} }) ) // add student to students records
  .then(() => db.ref(`cohorts/${cohortID}/studentIDs`).update({ [studentID]: true })) // add student to its particular cohort record
  .then(() => dispatch({
    type: TYPES.ADD_STUDENT_SUCCESS,
    studentID,
    fullName,
    cohortID,
    authorID,
    createdAt,
  }))
  .catch(err => {
    dispatch({
      type: TYPES.ADD_STUDENT_FAIL,
      studentID,
      fullName,
      cohortID,
      authorID,
      createdAt,
      err,
    })
    return Promise.reject(err)
  })
}

export const updateStudent = ( studentID, fullName ) => (dispatch) => {
  dispatch({
    type: TYPES.UPDATE_STUDENT_FULLNAME_INIT,
    studentID,
    fullName,
  })
  // check student doesnt exist
  return firebasePathExists(db, `students/${studentID}`)
  .then(() => 
    db.ref(`students/${studentID}`).update({
      fullName,
    }))
  .then(() => {
    dispatch({
      type: TYPES.UPDATE_STUDENT_FULLNAME_SUCCESS,
      studentID,
      fullName,
    })
  })
  .catch(err => {
    dispatch({ 
      type: TYPES.UPDATE_STUDENT_FULLNAME_FAIL,
      studentID,
      fullName,
      err,
    })
    return Promise.reject(err)
  })
}

export const removeStudent = (studentID) => (dispatch) => {
  dispatch({
    type: TYPES.REMOVE_STUDENT_INIT,
    studentID,
  })
  let cohortID, attemptIDs
  return db.ref(`students/${studentID}`).once('value')
  .then((snapshot) => {
    const student = snapshot.val()
    cohortID = student.cohortID // get associated cohort and delete the students ID from that cohorts record
    // combine all attempt IDs into one big object and have each attemptID set to null
    attemptIDs = _.reduce(student.exercises, (result, attemptIDs, key) => ({...result, ...attemptIDs }), {})
    attemptIDs = _.map(attemptIDs, (val, key) => null)
  })
  .then(() => db.ref(`cohorts/${cohortID}/studentIDs/${studentID}`).set(null))
  .then(() => db.ref(`attempts`).update(attemptIDs))
  .then(() => db.ref(`students/${studentID}`).set(null))
  .then(() => dispatch({
    type: TYPES.REMOVE_STUDENT_SUCCESS,
    studentID,
    cohortID,
  }))
  .catch(err => {
    dispatch({
      type: TYPES.REMOVE_STUDENT_FAIL,
      studentID,
      cohortID,
      err,
    })
    return Promise.reject(err)
  })
}

export const updateRecentCohort = (cohortID = null) => ({
  type: TYPES.UPDATE_RECENT_COHORT,
  cohortID,
})


window.addCohort = addCohort
window.removeCohort = removeCohort
window.addStudent = addStudent
window.removeStudent = removeStudent