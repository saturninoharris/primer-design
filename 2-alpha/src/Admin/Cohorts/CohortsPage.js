import React from 'react'
import styled from 'styled-components'

import AdminHeader from '../AdminHeader'
import CohortsList from './CohortsList'

const Container = styled.div`
`

const CohortsPage = () => (
  <Container>
    <AdminHeader title="Reports Dashboard" />
    {/* TODO: general cohorts dashboard overview (number of cohorts), possibly the most recent viewed one, with a dashboard of that? */}
    {/* TODO: add cohort search bar here */}
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <CohortsList />
        </div>
      </div>
    </div>
    
  </Container>
) 

export default CohortsPage