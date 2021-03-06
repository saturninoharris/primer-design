import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import * as api from '../../api'

const HaystackRestrictionSites = ({ 
  seq, 
  sequenceDirection = 'forward', 
  restrictionSites = [], 
  hoveredItem = null, 
  onHover = () => {},
  alwaysShowName = false,
}) => {
  const RESitesDOM = restrictionSites
  .sort((a, b) => a.pos - b.pos)
  .map((site) => {
    // if the restriction site is in the opposite direction of the strand, reverse the sequence
    if(sequenceDirection === 'forward' && site.direction === 'reverse') {
      return {...site, seq: api.reverse(site.seq)}
    }
    if (sequenceDirection === 'reverse' && site.direction !== 'reverse') {
      return { ...site, seq: api.reverse(site.seq) }
    }
    return site
  })
  .map((site, i) => {
    const className = (hoveredItem === i || alwaysShowName) ? 'hovered' : ''
    return (
      <div className={"Restriction-Site-Container sequence " + className} key={site.pos}>
        <div>
          {api.properSpacing(_.pad('', site.pos))}
          <span
            className={`Restriction-Site ${sequenceDirection === 'forward' ? 're-site-tl re-site-tr' : 're-site-bl re-site-br'}`}
            onMouseEnter={() => { onHover(i)}} onMouseLeave={() => onHover()}
            style={{ backgroundColor: site.color, color: api.pickTextColor(site.color) }}>
            {sequenceDirection === 'forward' ? <span className="Name" style={{color: site.color}}>{site.name}</span> : ''}
            {site.seq}
          </span>
        </div>
      </div>
    )
  })
  return (
    <div className="Haystack-Restriction-Sites">
      {RESitesDOM}
    </div>
  )
}
HaystackRestrictionSites.propTypes = {
  seq: PropTypes.string.isRequired,
  restrictionSites: PropTypes.arrayOf(PropTypes.shape({
    pos: PropTypes.number.isRequired,
    len: PropTypes.number.isRequired,
    color: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  hoveredItem: PropTypes.any, // null or number
}

export default HaystackRestrictionSites