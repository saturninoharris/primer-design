import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import styled from 'styled-components'
import _ from 'lodash'

import CohortEditStudent from './CohortEditStudent'
import { Title } from '../../components/Text'
import Loading from '../../components/Loading'
import { fetchStudents, updateStudent } from '../../actions/admin'
import { getStudentsOverviewList, getAuthorName } from '../../selectors/admin'

const Container = styled.div`
  
`

export class CohortEditStudents extends Component {
  state = {
    ready: false
  }
  componentDidMount() {
    console.log(this.props.studentIDs)
    this.props.fetchStudents(this.props.studentIDs).then(() => {
      this.setState({ ready: true })
    })
  }
  render() {
    const { studentIDs, cohortName, cohortID } = this.props
    const studentCount = _.size(studentIDs)
    if (!this.state.ready) return <Loading text={`Loading ${studentCount} students for cohort '${cohortName}'`} />

    return (
      <Container>
        <Title>{studentCount} students in total, add more below.</Title>
        {this.props.students.map(student =>
          <CohortEditStudent
            cohortID={cohortID}
            studentID={student.studentID} 
            handleSubmit={this.props.updateStudent}
            handleDelete={this.props.deleteStudent}
            fullName={student.fullName}
            completedCount={student.completedCount}
            createdAt={student.createdAt}
            authorName={student.authorName}
          />)
        }
      </Container>
    )
  }
}
CohortEditStudents.propTypes = {
  studentIDs: PropTypes.object.isRequired,
  cohortName: PropTypes.string.isRequired,
}

const mapStateToProps = (state, ownProps) => {
  const students = getStudentsOverviewList(state, { studentIDs: ownProps.studentIDs }).map(student => ({
    ...student, authorName: getAuthorName(state, { authorID: student.authorID })
    // not sure i should be doing this in here but i'd rather not ask for redux state in each student's record.
  }))
  return {
    students,
  }
}
const mapDispatchToProps = (dispatch) => {
  return {
    fetchStudents: (studentIDs) => dispatch(fetchStudents(studentIDs)), 
    updateStudent: (id, fullName) => dispatch(updateStudent({ id, fullName })),
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(CohortEditStudents)