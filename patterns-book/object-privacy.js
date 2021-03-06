// Uses ES6 syntax, use babel-node with nodemon

// 1. Object constructors with privacy
const Constructor = function(seq, res) {
	var plasmid = {
		id: new Date(),
		seq: seq,
		res: res
	}
	this.getSpecs = function() {
		return { ...plasmid } // returns a spread within an object
	}
	this.getSequence = function() {
		return {
			...plasmid, // as above but extended.
			age: 10
		}
	}
	this.setSequence = function() {
		plasmid.seq = 'BAM'
	}
}

var x = new Constructor('ATGC', 'AT')
// var edit = x.getSpecs()
var edit = x.getSequence()
console.log('edit', edit.seq)
edit.seq = 'TTTT' // why is this protected? uses primitive
console.log('edit', edit.seq) // seriously why
console.dir(edit = x.getSpecs()) // Note console.dir is identical to .log in terminal.
edit.seq = 'Nope'
console.dir(x.getSpecs()) // Note console.dir is identical to .log in terminal.
// console.dir is only useful for checking current object references in browsers
// or to check regex objects.

const person = {
  name: 'John',
  password: '123',
  age: 28
}
const newPersonWithout = function(properties) {
	if(Array.isArray(properties)) properties = [properties]
	return Object.keys(person).reduce((obj, key) =>
		properties.includes(key) ? obj : { ...obj, [key]: person[key]}
	, {}) // start off with empty object
}

var q = newPersonWithout('password')
console.log(q)


// 2. Object literals with privacy = encapsulate scope in IIFE with getter fn()
var myObj = (function() {
	var name = "default"
	return {
		getName: function() { return name }
	}
}())

console.log(myObj.getName()) // 'default'
