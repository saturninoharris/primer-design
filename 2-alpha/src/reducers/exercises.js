import _ from 'lodash'
import * as TYPES from '../actions/types'

export const exercisesById = (state = {}, action) => {
  switch (action.type) {
    case TYPES.FETCH_EXERCISES_SUCCESS:
      return action.payload // replace exercises
    case TYPES.ADD_EXERCISE_SUCCESS:
    case TYPES.UPDATE_EXERCISE_SUCCESS:
      return {...state, [action.id]: action.payload} // add exercises
    default: return state
  }
}

export const currentExercise = (state = null, action) => {
  switch (action.type) {
    case TYPES.SELECT_EXERCISE:
      return action.payload // id of exercise
    default: return state
  }
}

export const filterText = (state = '', action) => {
  switch (action.type) {
    case TYPES.FILTER_EXERCISES_BY_TEXT:
      return action.payload
    default: return state
  }
}

export const sortBy = (state = 'lastModified', action) => {
  switch (action.type) {
    case TYPES.SORT_EXERCISES_BY:
      return action.payload
    default: return state
  }
}

// export default exercises