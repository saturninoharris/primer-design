import _ from 'lodash'
import React, { Component } from 'react'
import { connect } from 'react-redux'
import { v4 } from 'uuid'
import moment from 'moment'
import { Field, FieldArray,  reduxForm, formValueSelector } from 'redux-form';

// Below should ALL be taken out
import { Left3, Left5, Right3, Right5 } from '../../components/HelperEnds'
import Codons from '../../components/Codons'
import HelperPosition from '../../components/HelperPosition'
import * as api from '../../api'
import { addExercise } from '../../actions/index';

class ExerciseEditor extends Component {
  renderField = ({ name, input, label, type, meta: { touched, error, warning }, ...props }) => (
    <div>
      <label htmlFor={name}>{label}</label>
      <div>
        <input {...input} id={name} placeholder={label} type={type} {...props} />
        {touched &&
          ((error && <span>{error}</span>) ||
            (warning && <span>{warning}</span>))}
      </div>
    </div>
  )
  getMarkers = (markers = []) => {
    return (
      <div className="Admin-Markers sequence"> 
        {markers.map(marker => {
          if(isNaN(marker)) return null
          return <span className="admin-marker" key={marker}>{_.padStart('|', marker, ' ')}</span>
        })}
      </div>
    )
  }
  renderHelpers = ({ fields, meta: { error, submitted }}) => {
    return (
      <ul className="list-group">
        {fields.map((helper, i) => (
          <li key={i} className="list-group-item">
            <button type="button" style={{position: 'absolute', right: -10, backgroundColor: 'red', color: 'white', border: 'none'}} onClick={() => fields.remove(i)}>X</button>
            <div className="row">
              <div className="col-6"><Field name={`${helper}.name`} type="text" component={this.renderField} label="Helper text" /></div>
              <div className="col-6"><Field name={`${helper}.pos`} type="number" component={this.renderField} label="Start position" /></div>
            </div>
            <div className="row">
              <div className="col-6"><Field name={`${helper}.len`} type="number" component={this.renderField} label="NT length" /></div>
              <div className="col-6"><Field name={`${helper}.color`} type="text" component={this.renderField} label="Color (#FF0000)" /></div>
            </div>
          </li>
        ))}
        <li className="text-center mt-3">
          <button type="button" onClick={() => fields.push({})} className="btn btn-success">Add helper</button>
        </li>
      </ul>
    )
  }
  render() {
    const { pristine, submitting, submitText = 'Create exercise', haystack, vector } = this.props
    return (
      <form onSubmit={this.props.handleSubmit} className="Admin-Exercise-Form" method="POST">
        <div className="row">
          <div className="col-4">
            Sidebar. Will contain: haystack start, end. vector start, end. helpers (pos, length, name, color).
            <div className="row mb-3">
              <div className="col-12"><strong>Haystack</strong></div>
              <div className="col-6">
                <Field component={this.renderField} className="form-control" type="number" name="constructStart" label="Start Position" />
              </div>
              <div className="col-6">
                <Field component={this.renderField} className="form-control" type="number" name="constructEnd" label="End Position" />
              </div>
            </div>
            <div className="row mb-3">
              <div className="col-12"><strong>Vector</strong></div>
              <div className="col-6">
                <Field component={this.renderField} className="form-control" type="checkbox" name="vectorContainsStart" label="Fusion protein at start" />
                <Field component={this.renderField} className="form-control" type="number" name="vectorStart" label="Start Position" />
              </div>
              <div className="col-6">
                <Field component={this.renderField} className="form-control" type="checkbox" name="vectorContainsEnd" label="Fusion protein at end" />
                <Field component={this.renderField} className="form-control" type="number" name="vectorEnd" label="End Position" />
              </div>
            </div>
            <div>
              <FieldArray name="helpers" component={this.renderHelpers} />
            </div>
          </div>
          <div className="col-8">
            <div className="form-group">
              <label className="d-block" htmlFor="questionPart1">Question part 1</label>
              <Field className="form-control" name="questionPart1" component="textarea" type="text" />
            </div>
            <div className="form-group">
              <label className="d-block" htmlFor="vector">Vector forward sequence</label>
              <Field className="form-control vectorInput" name="vector" component="textarea" type="text" />
            </div>
            <div className="form-group">
              <label className="d-block" htmlFor="questionPart2">Question part 2</label>
              <Field className="form-control" name="questionPart2" component="textarea" type="text" />
            </div>
            <div className="form-group">
              <label className="d-block" htmlFor="haystack">Haystack forward sequence</label>
              <Field className="form-control haystackInput" name="haystack" component="textarea" type="text" />
            </div>
            <div className="haystack admin-haystack">
              <HelperPosition length={100} />
              <div className="forward">
                <div className="multiline">
                  <div className="sequence">
                    {this.getMarkers(this.props.haystackMarkers)}
                    <Left5 />{haystack.forward}<Right3 />
                  </div>
                </div>
              </div>
              <div className="reverse">
                <div className="multiline">
                  <div className="sequence">
                    <Left3 />{haystack.reverse}<Right5 />
                  </div>
                  <Codons seq={haystack.forward} showCodons={true} />
                </div>
              </div>
            </div>
            <button type="submit" disabled={pristine || submitting}>{submitText}</button>
          </div>
        </div>
      </form>
    )
  }
}

ExerciseEditor = reduxForm({
  form: 'exerciseEditor',
})(ExerciseEditor)

const selector = formValueSelector('exerciseEditor')

const mapStateToProps = (state, { data = {}}) => {
  const { haystack = ' ', vector = ' ', vectorStart = null, vectorEnd = null, constructStart = null, constructEnd = null, helpers = [] } = selector(state, 
    'haystack', 'vector', 'vectorStart', 'vectorEnd', 'constructStart', 'constructEnd', 'helpers')
  const previews = {
    haystack: {
      forward: haystack,
      reverse: api.complementFromString(haystack),
    },
    vector: {
      forward: vector,
      reverse: api.complementFromString(vector)
    },
    haystackMarkers: [
      parseInt(constructStart, 10),
      parseInt(constructEnd, 10),
    ],
    vectorMarkers: [
      parseInt(vectorStart, 10),
      parseInt(vectorEnd, 10),
    ],
    helpers
  }
  const helpersArray = _.keys(data.helpers).map(pos => ({ ...data.helpers[pos] }))

  const initialValues = {
    ...data,
    helpers: helpersArray,
  }
  return { ...previews, initialValues}
}

const mapDispatchToProps = (dispatch, ownProps) => {
  const onSubmit = (values) => {
    const newPost = true
    // convert helpers array to an object
    const helpersObject = values.helpers.reduce((prev, helper) => ({
      ...prev,
      [helper.pos]: {
        name: helper.name,
        pos: parseInt(helper.pos, 10),
        len: parseInt(helper.len, 10),
        color: helper.color,
      }
    }), {})
    const exerciseData = {
      authorId: 'sedm4648',
      lastModified: moment().valueOf(),
      createdAt: ownProps.createdAt || moment().valueOf(),
      questionPart1: values.questionPart1,
      questionPart2: values.questionPart2,
      haystack: values.haystack,
      vector: values.vector,
      constructStart: parseInt(values.constructStart, 10),
      constructEnd: parseInt(values.constructEnd, 10),
      vectorStart: parseInt(values.vectorStart, 10),
      vectorEnd: parseInt(values.vectorEnd, 10),
      vectorContainsStart: !!values.vectorContainsStart,
      vectorContainsEnd: !!values.vectorContainsEnd,
      helpers: helpersObject,
    }
    console.log(exerciseData)

    if(newPost) {
      dispatch(addExercise(exerciseData))
    } else {
      // dispatch(updateExercise)
    }
  }
  
  return { onSubmit }
}

ExerciseEditor = connect(mapStateToProps, mapDispatchToProps)(ExerciseEditor)

export default ExerciseEditor