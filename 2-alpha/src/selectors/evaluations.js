import _ from 'lodash'
import { createSelector } from 'reselect'
import * as api from '../api'
import { 
  getCurrentExercise, 
  getVectorRestrictionSites,
  getBothHaystackStrands,
  getURV, 
  getUFV, 
  getUFG, 
  getURVHund80, 
  getURVReverse, 
  getURGReverse,
  getHaystackForwardRestrictionSites,
  getHaystackReverseRestrictionSites,
  getEditingGameInputs,
} from './index'

// function that returns an object which can be used to createMessage directly, or through a shorthand:
// First create a category and assign it to a variable: const myCategory = createCategory('myCat')
// Then call the success/failure fns: myCategory.success(msg) myCategory.failure(msg)
const createEvaluation = (...initialStates) => {
  const state = Array.isArray(initialStates) ? initialStates.reduce((p, c) => [...p, ...c], []) : []
  let anyErrors = false
  const createMessage = ({ inputs, success, messageID, context }) => {
    if (!inputs) throw Error('Missing inputs in createMessage.')
    if (!messageID) throw Error('Missing messageID in createMessage.')
    state.push({ inputs, success, ID: messageID, context })
    if (success === false) anyErrors = true
    return // to send back true or false or null here?
  }
  const getEvaluation = () => {
    return state
  }
  const hasErrors = () => anyErrors
  const contains = (searchID) => state.find(msg => msg.ID === searchID)
  const doesntContain = (searchID) => !contains(searchID)

  const createCategory = (...inputs) => ({ // inputs include:
    success: (messageID, context) => {
      createMessage({ inputs, messageID, context, success: true })
    },
    failure: (messageID, context) => {
      createMessage({ inputs, messageID, context, success: false })
      return getEvaluation()
    }
  })

  return {
    getEvaluation,
    createCategory,
    createMessage,
    hasErrors,
    contains,
    doesntContain
  }
}

const getMatchParameters = (RESite, input, forwardDirection = true) => {
  // a RESite has a sequence, pos, cutsForward, name
  // if input is for the reverse strand, then its RESite seq must be reversed
  // const REMatchingSeq = forwardDirection ? RESite.seq : api.reverse(RESite.seq)
  
  // every input can be split up into a leading, "match", and trailing sequence:
  // ABCTTTTGGXYZ -> ABC leading, TTTTGG match, XYZ leading
  // console.log(REMatchingSeq)
  const REMatchPos = input.indexOf(RESite.seq)
  // if(REMatchPos === -1) throw Error('getMatchParameters called on zero matches')

  // lets chunk up the input into two parts now:
  // for forward primer: [leading, trailing]
  // for reverse primer: [trailing, leading]
  let seqChunks = [
    input.slice(0, REMatchPos),
    input.slice(REMatchPos + RESite.seq.length)
  ]
  if(forwardDirection === false) {
    seqChunks = seqChunks.map(api.reverse)
  }
  let trailingSeq = forwardDirection ? seqChunks[1] : seqChunks[1]
  let leadingSeq = forwardDirection ? seqChunks[0] : seqChunks[0]
  return {
    input,
    REMatchPos,
    ...RESite,
    leadingSeq,
    REMatchingSeq: forwardDirection ? RESite.seq : api.reverse(RESite.seq), 
    trailingSeq,
    cutsAt: RESite.pos + (forwardDirection ? RESite.cutsForward : RESite.cutsReverse),
    endPos: RESite.pos + RESite.seq.length,
    positionInVector: RESite.pos - (forwardDirection ? leadingSeq.length : trailingSeq.length),
  }
}

export const getUserVectorMatchForward = createSelector(
  getUFV,
  getCurrentExercise,
  getVectorRestrictionSites,
  (input, { fusionStart, vectorStart, vector }, RESites) => {
    const matches = RESites 
      .filter(RESite => input.includes(RESite.seq))
      .map(RESite => getMatchParameters(RESite, input, true))

    if (matches.length !== 1) {  
      return { 
        matches,
        multipleMatches: true
      }
    }
    const singleMatch = { ...matches[0] } // only one match

    if(fusionStart) {
      singleMatch['betweenStartAndREStr'] = vector.substring(vectorStart, singleMatch.pos) // ZZZZZATAGCG (vector) -> ZZZZZ
      singleMatch['betweenStartAndRE'] = singleMatch['betweenStartAndREStr'].length // ZZZZZ -> 5
      singleMatch['toGetDesiredFrame'] = (3 - singleMatch['betweenStartAndRE'] % 3) % 3
      // singleMatch['input'] = input
    }
    // return console.log('singleMatch:', { singleMatch }) || { singleMatch }
    return { singleMatch }
  }
)

export const getUserVectorMatchReverse = createSelector(
  getURVHund80,
  getURV,
  getCurrentExercise,
  getVectorRestrictionSites,
  (inputHund80, input, { fusionEnd, vectorEnd, vector }, RESites) => {
    const matches = RESites
      .filter(RESite => inputHund80.includes(RESite.seq))
      .map(RESite => getMatchParameters(RESite, input, false))

    if (matches.length !== 1) {
      return { 
        matches,
        multipleMatches: true
      }
    }
    const singleMatch = { ...matches[0] } // only one match

    if (fusionEnd) {
      singleMatch['betweenEndAndREStr'] = vector.slice(singleMatch.pos + 6, vectorEnd) // ATAGCGZZZZZ (vector) -> ZZZZZ
      singleMatch['betweenEndAndRE'] = singleMatch['betweenEndAndREStr'].length // ZZZZZ -> 5
      singleMatch['toGetDesiredFrame'] = (3 - singleMatch['betweenEndAndRE'] % 3) % 3
      // singleMatch['input'] = input
    }
    return { singleMatch }
  }
)

export const getHaystackForwardMatches = createSelector(
  getUFG,
  getBothHaystackStrands,
  getCurrentExercise,
  (input, { forward }, { constructStart }) => {
    if (input.length < 4) return {}
    const forwardMatches = {
      rightSeq: forward.substr(constructStart, input.length),
      input,
      tooShort: api.isTooShort(input),
      tooLong: api.isTooLong(input),
      pos: constructStart,
      endPos: constructStart + input.length,
      ...api.shotgunAllPotentialMatches({ haystack: forward, query: input, pos: constructStart })
    }
    return forwardMatches
  }
)

export const getHaystackReverseMatches = createSelector(
  getURGReverse,
  getBothHaystackStrands,
  getCurrentExercise,
  (input, { reverse }, { constructEnd }) => {
    if (input.length < 4) return {}
    // for this, we keep the haystack the same and reverse the users input. Substring the haystack by the input length for checking.
    const pos = constructEnd - input.length
    const reverseMatches = {
      input,
      tooShort: api.isTooShort(input),
      tooLong: api.isTooLong(input),
      pos,
      endPos: constructEnd,
      ...api.shotgunAllPotentialMatches({ haystack: reverse, query: input, pos: pos }),
    }
    return reverseMatches
  }
)



// evaluations which are independent of vector input
export const getHaystackEvaluations = createSelector(
  getHaystackForwardMatches,
  getHaystackReverseMatches,
  getEditingGameInputs,
  (FG, RG, editing) => {
    // set up
    const Eval = createEvaluation()
    const EvalFG = Eval.createCategory('FG')
    const EvalRG = Eval.createCategory('RG')

    // check if right completely (and frame)
    if (FG.input) {
      if (FG.normalMatch) EvalFG.success('FORWARD_HAYSTACK_MATCH')
      if (FG.complementMatch) EvalFG.failure('FORWARD_WRONG_STRAND')
      if (FG.reverseMatch) EvalFG.failure('FORWARD_WRONG_DIRECTION')
      if (FG.frame && FG.frame !== 0) EvalFG.failure('FORWARD_HAYSTACK_OUT_OF_FRAME', FG.frame)
      if (!FG.normalMatch && !FG.complementMatch && !FG.reverseMatch) EvalFG.failure("FORWARD_NO_MATCH")
      if (api.isTooShort(FG.input) && !editing.FG) EvalFG.failure('FORWARD_TOO_SHORT')
    }

    if (RG.input) {
      if (RG.normalMatch) EvalRG.success('REVERSE_HAYSTACK_MATCH')
      if (RG.complementMatch) EvalRG.failure('REVERSE_WRONG_STRAND')
      if (RG.reverseMatch) EvalRG.failure('REVERSE_WRONG_DIRECTION')
      if (RG.frame && RG.frame !== 0) EvalRG.failure('REVERSE_HAYSTACK_OUT_OF_FRAME', RG.frame)
      if (!RG.normalMatch && !RG.complementMatch && !RG.reverseMatch) EvalRG.failure("REVERSE_NO_MATCH")
      if (api.isTooShort(RG.input) && !editing.RG) EvalRG.failure('REVERSE_TOO_SHORT')
    }
    // go to vector evaluations!
    return Eval.getEvaluation()
  })

// evaluations which are independent of haystack input
export const getVectorEvaluations = createSelector(
  getUserVectorMatchForward,
  getUserVectorMatchReverse,
  getUFV,
  getURV,
  getHaystackForwardRestrictionSites,
  getHaystackReverseRestrictionSites,
  (FV, RV, UFV, URV, FG_RE_Sites, RG_RE_Sites) => {
    const Eval = createEvaluation()
    const EvalFV = Eval.createCategory('FV')
    const EvalRV = Eval.createCategory('RV')
    const FVRV = Eval.createCategory('RV', 'FV')
    const UFVReadyToCheck = UFV.length >= 6
    const URVReadyToCheck = URV.length >= 6

    // No input or not enough to check against, return early
    if (!UFVReadyToCheck && !URVReadyToCheck) return Eval.getEvaluation()

    // If no match or too many matches, then return early as later logic requires a single match
    if (UFVReadyToCheck) {
      if (FV.singleMatch) {
        EvalFV.success('FV_MATCHES_ONCE')
        if (FG_RE_Sites.find(RESite => UFV.includes(RESite.seq))) EvalFV.failure('HAYSTACK_FORWARD_CONTAINS_FV_SITE')
        if (RG_RE_Sites.find(RESite => UFV.includes(RESite.seq))) EvalFV.failure('HAYSTACK_REVERSE_CONTAINS_FV_SITE')
      } else {
        // check if reversed input contains an RE site, indicate that the wrong direction was supplied
        if (api.getRestrictionSiteMatches(api.reverse(UFV)).length > 0) EvalFV.failure('FV_MATCHES_WRONG_STRAND') // BUGGY FIX THIS....
      }
      if (FV.matches && FV.matches.length === 0) EvalFV.failure("NO_MATCH_FV")
      if (FV.matches && FV.matches.length > 0) EvalFV.failure("EXCEED_MATCH_FV")
    }
    if (URVReadyToCheck) {
      if (RV.singleMatch) {
        EvalRV.success('RV_MATCHES_ONCE')
        if (FG_RE_Sites.find(RESite => URV.includes(RESite.seq))) EvalRV.failure('HAYSTACK_FORWARD_CONTAINS_RV_SITE')
        if (RG_RE_Sites.find(RESite => URV.includes(RESite.seq))) EvalRV.failure('HAYSTACK_REVERSE_CONTAINS_RV_SITE')
      } else {
        if (api.getRestrictionSiteMatches(api.reverse(URV)).length > 0) EvalRV.failure('RV_MATCHES_WRONG_STRAND') // BUGGY
      }
      if (RV.matches && RV.matches.length === 0) EvalRV.failure("NO_MATCH_RV")
      if (RV.matches && RV.matches.length > 0) EvalRV.failure("EXCEED_MATCH_RV")
    }


    // If either aren't ready yet, stop now
    if (Eval.doesntContain('FV_MATCHES_ONCE') || Eval.doesntContain('RV_MATCHES_ONCE')) {
      return Eval.getEvaluation()
    }

    // For readability
    FV = FV.singleMatch
    RV = RV.singleMatch

    // restriction sites cannot be the same
    if (FV.seq === api.reverse(RV.seq)) FVRV.failure("SAME_RESTRICTION_SITES")

    // Spacing between primers
    if (FV.endPos > RV.pos) FVRV.failure("VECTOR_OVERLAP")
    const differenceBetweenVectorPrimers = RV.pos - FV.endPos
    if (differenceBetweenVectorPrimers <= 4) FVRV.failure("VECTORS_TOO_CLOSE", differenceBetweenVectorPrimers)

    if (Eval.hasErrors()) return Eval.getEvaluation()
    FVRV.success("VECTOR_PRIMERS_APART")

    // go to final evaluations!
    return Eval.getEvaluation()
  })

// evaluations which depend on both haystack and vector
export const getAllEvaluations = createSelector(
  getVectorEvaluations,
  getHaystackEvaluations,
  getCurrentExercise,
  getUserVectorMatchForward,
  getUserVectorMatchReverse,
  getHaystackForwardMatches,
  getHaystackReverseMatches,
  (EvalVector, EvalHaystack, exercise, FV, RV, FG, RG) => {
    const Eval = createEvaluation(EvalHaystack, EvalVector)
    const EvalFV = Eval.createCategory('FV')
    const EvalRV = Eval.createCategory('RV')
    const EvalALL = Eval.createCategory('RV', 'FV', 'FG', 'RG')
    if (!FV.singleMatch || !RV.singleMatch) return Eval.getEvaluation()
    // does Forward primer need a start codon in this exercise, if not:
    if (FG.isExact && FG.normalMatch) {
      // check in-frame with constructStart and vectorStart
      if (exercise.fusionStart) {
        const diffBetweenForwardFrameAndDesired = (FV.singleMatch.toGetDesiredFrame - FV.singleMatch.trailingSeq.length)
        if (diffBetweenForwardFrameAndDesired === 0) {
          EvalFV.success('FORWARD_BOTH_IN_FRAME')
        } else {
          EvalFV.failure('FORWARD_BOTH_OUT_OF_FRAME', diffBetweenForwardFrameAndDesired)
        }
        // check in-frame with constructStart and placed start codon
      } else {
        if (exercise.userProvidesStartCodon) {
          const startCodonPos = FV.singleMatch.trailingSeq.toUpperCase().indexOf('ATG')
          if (startCodonPos > -1) {

            EvalFV.success('FORWARD_INCLUDES_START_CODON')
            const startCodonFrame = FV.singleMatch.trailingSeq.slice(startCodonPos).length % 3
            if (startCodonFrame !== 0) EvalFV.failure('FORWARD_START_CODON_OUT_OF_FRAME', startCodonFrame)

          } else {
            EvalFV.failure('FORWARD_MISSING_START_CODON')
          }
        }
      }
    }

    if (RG.isExact && RG.normalMatch) {
      // does Reverse primer need a stop codon in this exercise, if so:
      if (exercise.fusionEnd) { // no need for stop codon
        const diffBetweenReverseFrameAndDesired = (RV.singleMatch.toGetDesiredFrame - RV.singleMatch.trailingSeq.length)
        if (diffBetweenReverseFrameAndDesired === 0) {
          EvalRV.success('REVERSE_BOTH_IN_FRAME')
        } else {
          EvalRV.failure('REVERSE_BOTH_OUT_OF_FRAME', diffBetweenReverseFrameAndDesired)
        }
        // check in-frame with constructEnd and placed end codon
      } else {
        if (exercise.userProvidesStopCodon) {
          const endCodonMatch = /(TAA)|(TAG)|(TGA)/i.exec(api.reverse(RV.singleMatch.trailingSeq))
          if (endCodonMatch !== null) {

            EvalRV.success('REVERSE_INCLUDES_STOP_CODON')
            let endCodonFrame = FV.singleMatch.trailingSeq.slice(0, endCodonMatch.index).length % 3
            if (endCodonFrame !== 0) EvalFV.failure('REVERSE_STOP_CODON_OUT_OF_FRAME', endCodonFrame)

          } else {
            EvalRV.failure('REVERSE_MISSING_STOP_CODON')
          }
        }
      }
    }

    // check if picked restriction sites are not in haystack
    

    // check 3' GC end cap

    // check GC content

    // check melting temperature

    // check 5' end cap

    // COMPLETED EXERCISE. Ready to go
    if (Eval.contains('VECTOR_PRIMERS_APART') && Eval.contains('REVERSE_BOTH_IN_FRAME') && Eval.contains('FORWARD_BOTH_IN_FRAME')) {
      EvalALL.success('READY')
    }
    const result = Eval.getEvaluation()
    // console.log('Evaluations result: ', result)
    return result
  })

// This means the user has entered successful inputs, but has not 'submitted' just yet.
export const getIsSuccessful = createSelector(getAllEvaluations,
  (evaluations) => evaluations.find(msg => msg.ID === 'READY' && msg.success))


export const getFinalClone = createSelector(
  getCurrentExercise,
  getUserVectorMatchForward,
  getUserVectorMatchReverse,
  getHaystackForwardMatches,
  getHaystackReverseMatches,
  (exercise, { singleMatch: FV }, { singleMatch: RV }, FG, RG) => {
    const helpers = []

    const vectorStartSeq = exercise.vector.slice(0, FV.positionInVector)
    const startPosOfSecondPart = FV.positionInVector + FV.input.length + exercise.haystack.length
    const vectorEndSeq = exercise.vector.slice(RV.positionInVector + FV.input.length)

    // helper pushing: look at vector and see which helpers are before the first cut off point or after the second. includes those in.
    _.mapValues(exercise.helpers, (helper) => {
      if (helper.pos < FV.positionInVector) {
        helpers.push(helper)
      }
      if (helper.pos > (RV.pos + 6)) {
        helpers.push({ ...helper, pos: (startPosOfSecondPart + helper.pos - RV.positionInVector - RV.trailingSeq.length) })
      }
    })

    const construct = exercise.haystack.slice(exercise.constructStart, exercise.constructEnd)

    const forward = {
      [vectorStartSeq]: {
        seq: vectorStartSeq, text: 'Vector start'
      },
      [FV.leadingSeq]: {
        seq: FV.leadingSeq, text: `Forward primer's 5' clamp`
      },
      [FV.seq]: {
        seq: FV.seq, text: `Forward restriction site match: ${FV.name}`
      },
      [FV.trailingSeq]: {
        seq: FV.trailingSeq, text: 'Additional sequence to get construct in sequence'
      },
      [construct]: {
        seq: construct, text: 'Construct sequence to be cloned'
      },
      [RV.trailingSeq]: {
        seq: RV.trailingSeq, text: 'Additional sequence to get construct in sequence'
      },
      [RV.seq]: {
        seq: RV.seq, text: `Reverse restriction site match: ${RV.name}`
      },
      [RV.leadingSeq]: {
        seq: RV.leadingSeq, text: `Reverse primer's 5' clamp.`
      },
      [vectorEndSeq]: {
        seq: vectorEndSeq, text: 'Vector end'
      },
    }

    const markers = _.map(forward, ({ seq, text }) => seq)

    return {
      forward,
      markers,
      helpers
    }

  }
)