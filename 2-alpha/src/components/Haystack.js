import React, { Component } from 'react'
import { connect } from 'react-redux'
import { getBothHaystackStrands } from '../selectors'
import HelperPosition from './HelperPosition'
import HaystackForward from './HaystackForward';
import HaystackReverse from './HaystackReverse'

class Haystack extends Component {
  render() {
    const { forward, reverse } = this.props
    return (
      <div className="haystack">
        <h4>Haystack</h4>
        <HelperPosition length={100} />
        <div className="forward">
          <div className="sequence">{forward}</div>
          <HaystackReverse />
        </div>
        <div className="reverse">
          <HaystackForward />
          <div className="sequence">{reverse}</div>
        </div>
      </div>
    )
  }
}

const mapStateToProps = (state) => {
  return {
    ...getBothHaystackStrands(state)
  }
}

export default connect(mapStateToProps)(Haystack)