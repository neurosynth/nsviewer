(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict"

var compile = require("cwise-compiler")

var EmptyProc = {
  body: "",
  args: [],
  thisVars: [],
  localVars: []
}

function fixup(x) {
  if(!x) {
    return EmptyProc
  }
  for(var i=0; i<x.args.length; ++i) {
    var a = x.args[i]
    if(i === 0) {
      x.args[i] = {name: a, lvalue:true, rvalue: !!x.rvalue, count:x.count||1 }
    } else {
      x.args[i] = {name: a, lvalue:false, rvalue:true, count: 1}
    }
  }
  if(!x.thisVars) {
    x.thisVars = []
  }
  if(!x.localVars) {
    x.localVars = []
  }
  return x
}

function pcompile(user_args) {
  return compile({
    args:     user_args.args,
    pre:      fixup(user_args.pre),
    body:     fixup(user_args.body),
    post:     fixup(user_args.proc),
    funcName: user_args.funcName
  })
}

function makeOp(user_args) {
  var args = []
  for(var i=0; i<user_args.args.length; ++i) {
    args.push("a"+i)
  }
  var wrapper = new Function("P", [
    "return function ", user_args.funcName, "_ndarrayops(", args.join(","), ") {P(", args.join(","), ");return a0}"
  ].join(""))
  return wrapper(pcompile(user_args))
}

var assign_ops = {
  add:  "+",
  sub:  "-",
  mul:  "*",
  div:  "/",
  mod:  "%",
  band: "&",
  bor:  "|",
  bxor: "^",
  lshift: "<<",
  rshift: ">>",
  rrshift: ">>>"
}
;(function(){
  for(var id in assign_ops) {
    var op = assign_ops[id]
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a","b","c"],
             body: "a=b"+op+"c"},
      funcName: id
    })
    exports[id+"eq"] = makeOp({
      args: ["array","array"],
      body: {args:["a","b"],
             body:"a"+op+"=b"},
      rvalue: true,
      funcName: id+"eq"
    })
    exports[id+"s"] = makeOp({
      args: ["array", "array", "scalar"],
      body: {args:["a","b","s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    })
    exports[id+"seq"] = makeOp({
      args: ["array","scalar"],
      body: {args:["a","s"],
             body:"a"+op+"=s"},
      rvalue: true,
      funcName: id+"seq"
    })
  }
})();

var unary_ops = {
  not: "!",
  bnot: "~",
  neg: "-",
  recip: "1.0/"
}
;(function(){
  for(var id in unary_ops) {
    var op = unary_ops[id]
    exports[id] = makeOp({
      args: ["array", "array"],
      body: {args:["a","b"],
             body:"a="+op+"b"},
      funcName: id
    })
    exports[id+"eq"] = makeOp({
      args: ["array"],
      body: {args:["a"],
             body:"a="+op+"a"},
      rvalue: true,
      count: 2,
      funcName: id+"eq"
    })
  }
})();

var binary_ops = {
  and: "&&",
  or: "||",
  eq: "===",
  neq: "!==",
  lt: "<",
  gt: ">",
  leq: "<=",
  geq: ">="
}
;(function() {
  for(var id in binary_ops) {
    var op = binary_ops[id]
    exports[id] = makeOp({
      args: ["array","array","array"],
      body: {args:["a", "b", "c"],
             body:"a=b"+op+"c"},
      funcName: id
    })
    exports[id+"s"] = makeOp({
      args: ["array","array","scalar"],
      body: {args:["a", "b", "s"],
             body:"a=b"+op+"s"},
      funcName: id+"s"
    })
    exports[id+"eq"] = makeOp({
      args: ["array", "array"],
      body: {args:["a", "b"],
             body:"a=a"+op+"b"},
      rvalue:true,
      count:2,
      funcName: id+"eq"
    })
    exports[id+"seq"] = makeOp({
      args: ["array", "scalar"],
      body: {args:["a","s"],
             body:"a=a"+op+"s"},
      rvalue:true,
      count:2,
      funcName: id+"seq"
    })
  }
})();

var math_unary = [
  "abs",
  "acos",
  "asin",
  "atan",
  "ceil",
  "cos",
  "exp",
  "floor",
  "log",
  "round",
  "sin",
  "sqrt",
  "tan"
]
;(function() {
  for(var i=0; i<math_unary.length; ++i) {
    var f = math_unary[i]
    exports[f] = makeOp({
                    args: ["array", "array"],
                    pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                    body: {args:["a","b"], body:"a=this_f(b)", thisVars:["this_f"]},
                    funcName: f
                  })
    exports[f+"eq"] = makeOp({
                      args: ["array"],
                      pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                      body: {args: ["a"], body:"a=this_f(a)", thisVars:["this_f"]},
                      rvalue: true,
                      count: 2,
                      funcName: f+"eq"
                    })
  }
})();

var math_comm = [
  "max",
  "min",
  "atan2",
  "pow"
]
;(function(){
  for(var i=0; i<math_comm.length; ++i) {
    var f= math_comm[i]
    exports[f] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f
                })
    exports[f+"s"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(b,c)", thisVars:["this_f"]},
                  funcName: f+"s"
                  })
    exports[f+"eq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"eq"
                  })
    exports[f+"seq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(a,b)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"seq"
                  })
  }
})();

var math_noncomm = [
  "atan2",
  "pow"
]
;(function(){
  for(var i=0; i<math_noncomm.length; ++i) {
    var f= math_noncomm[i]
    exports[f+"op"] = makeOp({
                  args:["array", "array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"op"
                })
    exports[f+"ops"] = makeOp({
                  args:["array", "array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b","c"], body:"a=this_f(c,b)", thisVars:["this_f"]},
                  funcName: f+"ops"
                  })
    exports[f+"opeq"] = makeOp({ args:["array", "array"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue: true,
                  count: 2,
                  funcName: f+"opeq"
                  })
    exports[f+"opseq"] = makeOp({ args:["array", "scalar"],
                  pre: {args:[], body:"this_f=Math."+f, thisVars:["this_f"]},
                  body: {args:["a","b"], body:"a=this_f(b,a)", thisVars:["this_f"]},
                  rvalue:true,
                  count:2,
                  funcName: f+"opseq"
                  })
  }
})();

exports.any = compile({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "if(a){return true}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return false"},
  funcName: "any"
})

exports.all = compile({
  args:["array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1}], body: "if(!x){return false}", localVars: [], thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "all"
})

exports.sum = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s+=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "sum"
})

exports.prod = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=1"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:1}], body: "this_s*=a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "prod"
})

exports.norm2squared = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm2squared"
})
  
exports.norm2 = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:2}], body: "this_s+=a*a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return Math.sqrt(this_s)"},
  funcName: "norm2"
})
  

exports.norminf = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:4}], body:"if(-a>this_s){this_s=-a}else if(a>this_s){this_s=a}", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norminf"
})

exports.norm1 = compile({
  args:["array"],
  pre: {args:[], localVars:[], thisVars:["this_s"], body:"this_s=0"},
  body: {args:[{name:"a", lvalue:false, rvalue:true, count:3}], body: "this_s+=a<0?-a:a", localVars: [], thisVars: ["this_s"]},
  post: {args:[], localVars:[], thisVars:["this_s"], body:"return this_s"},
  funcName: "norm1"
})

exports.sup = compile({
  args: [ "array" ],
  pre:
   { body: "this_h=-Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_>this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 })

exports.inf = compile({
  args: [ "array" ],
  pre:
   { body: "this_h=Infinity",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] },
  body:
   { body: "if(_inline_1_arg0_<this_h)this_h=_inline_1_arg0_",
     args: [{"name":"_inline_1_arg0_","lvalue":false,"rvalue":true,"count":2} ],
     thisVars: [ "this_h" ],
     localVars: [] },
  post:
   { body: "return this_h",
     args: [],
     thisVars: [ "this_h" ],
     localVars: [] }
 })

exports.argmin = compile({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_<this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
})

exports.argmax = compile({
  args:["index","array","shape"],
  pre:{
    body:"{this_v=-Infinity;this_i=_inline_0_arg2_.slice(0)}",
    args:[
      {name:"_inline_0_arg0_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg1_",lvalue:false,rvalue:false,count:0},
      {name:"_inline_0_arg2_",lvalue:false,rvalue:true,count:1}
      ],
    thisVars:["this_i","this_v"],
    localVars:[]},
  body:{
    body:"{if(_inline_1_arg1_>this_v){this_v=_inline_1_arg1_;for(var _inline_1_k=0;_inline_1_k<_inline_1_arg0_.length;++_inline_1_k){this_i[_inline_1_k]=_inline_1_arg0_[_inline_1_k]}}}",
    args:[
      {name:"_inline_1_arg0_",lvalue:false,rvalue:true,count:2},
      {name:"_inline_1_arg1_",lvalue:false,rvalue:true,count:2}],
    thisVars:["this_i","this_v"],
    localVars:["_inline_1_k"]},
  post:{
    body:"{return this_i}",
    args:[],
    thisVars:["this_i"],
    localVars:[]}
})  

exports.random = makeOp({
  args: ["array"],
  pre: {args:[], body:"this_f=Math.random", thisVars:["this_f"]},
  body: {args: ["a"], body:"a=this_f()", thisVars:["this_f"]},
  funcName: "random"
})

exports.assign = makeOp({
  args:["array", "array"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assign" })

exports.assigns = makeOp({
  args:["array", "scalar"],
  body: {args:["a", "b"], body:"a=b"},
  funcName: "assigns" })


exports.equals = compile({
  args:["array", "array"],
  pre: EmptyProc,
  body: {args:[{name:"x", lvalue:false, rvalue:true, count:1},
               {name:"y", lvalue:false, rvalue:true, count:1}], 
        body: "if(x!==y){return false}", 
        localVars: [], 
        thisVars: []},
  post: {args:[], localVars:[], thisVars:[], body:"return true"},
  funcName: "equals"
})



},{"cwise-compiler":2}],2:[function(require,module,exports){
"use strict"

var createThunk = require("./lib/thunk.js")

function Procedure() {
  this.argTypes = []
  this.shimArgs = []
  this.arrayArgs = []
  this.arrayBlockIndices = []
  this.scalarArgs = []
  this.offsetArgs = []
  this.offsetArgIndex = []
  this.indexArgs = []
  this.shapeArgs = []
  this.funcName = ""
  this.pre = null
  this.body = null
  this.post = null
  this.debug = false
}

function compileCwise(user_args) {
  //Create procedure
  var proc = new Procedure()
  
  //Parse blocks
  proc.pre    = user_args.pre
  proc.body   = user_args.body
  proc.post   = user_args.post

  //Parse arguments
  var proc_args = user_args.args.slice(0)
  proc.argTypes = proc_args
  for(var i=0; i<proc_args.length; ++i) {
    var arg_type = proc_args[i]
    if(arg_type === "array" || (typeof arg_type === "object" && arg_type.blockIndices)) {
      proc.argTypes[i] = "array"
      proc.arrayArgs.push(i)
      proc.arrayBlockIndices.push(arg_type.blockIndices ? arg_type.blockIndices : 0)
      proc.shimArgs.push("array" + i)
      if(i < proc.pre.args.length && proc.pre.args[i].count>0) {
        throw new Error("cwise: pre() block may not reference array args")
      }
      if(i < proc.post.args.length && proc.post.args[i].count>0) {
        throw new Error("cwise: post() block may not reference array args")
      }
    } else if(arg_type === "scalar") {
      proc.scalarArgs.push(i)
      proc.shimArgs.push("scalar" + i)
    } else if(arg_type === "index") {
      proc.indexArgs.push(i)
      if(i < proc.pre.args.length && proc.pre.args[i].count > 0) {
        throw new Error("cwise: pre() block may not reference array index")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array index")
      }
      if(i < proc.post.args.length && proc.post.args[i].count > 0) {
        throw new Error("cwise: post() block may not reference array index")
      }
    } else if(arg_type === "shape") {
      proc.shapeArgs.push(i)
      if(i < proc.pre.args.length && proc.pre.args[i].lvalue) {
        throw new Error("cwise: pre() block may not write to array shape")
      }
      if(i < proc.body.args.length && proc.body.args[i].lvalue) {
        throw new Error("cwise: body() block may not write to array shape")
      }
      if(i < proc.post.args.length && proc.post.args[i].lvalue) {
        throw new Error("cwise: post() block may not write to array shape")
      }
    } else if(typeof arg_type === "object" && arg_type.offset) {
      proc.argTypes[i] = "offset"
      proc.offsetArgs.push({ array: arg_type.array, offset:arg_type.offset })
      proc.offsetArgIndex.push(i)
    } else {
      throw new Error("cwise: Unknown argument type " + proc_args[i])
    }
  }
  
  //Make sure at least one array argument was specified
  if(proc.arrayArgs.length <= 0) {
    throw new Error("cwise: No array arguments specified")
  }
  
  //Make sure arguments are correct
  if(proc.pre.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in pre() block")
  }
  if(proc.body.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in body() block")
  }
  if(proc.post.args.length > proc_args.length) {
    throw new Error("cwise: Too many arguments in post() block")
  }

  //Check debug flag
  proc.debug = !!user_args.printCode || !!user_args.debug
  
  //Retrieve name
  proc.funcName = user_args.funcName || "cwise"
  
  //Read in block size
  proc.blockSize = user_args.blockSize || 64

  return createThunk(proc)
}

module.exports = compileCwise

},{"./lib/thunk.js":4}],3:[function(require,module,exports){
"use strict"

var uniq = require("uniq")

// This function generates very simple loops analogous to how you typically traverse arrays (the outermost loop corresponds to the slowest changing index, the innermost loop to the fastest changing index)
// TODO: If two arrays have the same strides (and offsets) there is potential for decreasing the number of "pointers" and related variables. The drawback is that the type signature would become more specific and that there would thus be less potential for caching, but it might still be worth it, especially when dealing with large numbers of arguments.
function innerFill(order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , has_index = proc.indexArgs.length>0
    , code = []
    , vars = []
    , idx=0, pidx=0, i, j
  for(i=0; i<dimension; ++i) { // Iteration variables
    vars.push(["i",i,"=0"].join(""))
  }
  //Compute scan deltas
  for(j=0; j<nargs; ++j) {
    for(i=0; i<dimension; ++i) {
      pidx = idx
      idx = order[i]
      if(i === 0) { // The innermost/fastest dimension's delta is simply its stride
        vars.push(["d",j,"s",i,"=t",j,"p",idx].join(""))
      } else { // For other dimensions the delta is basically the stride minus something which essentially "rewinds" the previous (more inner) dimension
        vars.push(["d",j,"s",i,"=(t",j,"p",idx,"-s",pidx,"*t",j,"p",pidx,")"].join(""))
      }
    }
  }
  code.push("var " + vars.join(","))
  //Scan loop
  for(i=dimension-1; i>=0; --i) { // Start at largest stride and work your way inwards
    idx = order[i]
    code.push(["for(i",i,"=0;i",i,"<s",idx,";++i",i,"){"].join(""))
  }
  //Push body of inner loop
  code.push(body)
  //Advance scan pointers
  for(i=0; i<dimension; ++i) {
    pidx = idx
    idx = order[i]
    for(j=0; j<nargs; ++j) {
      code.push(["p",j,"+=d",j,"s",i].join(""))
    }
    if(has_index) {
      if(i > 0) {
        code.push(["index[",pidx,"]-=s",pidx].join(""))
      }
      code.push(["++index[",idx,"]"].join(""))
    }
    code.push("}")
  }
  return code.join("\n")
}

// Generate "outer" loops that loop over blocks of data, applying "inner" loops to the blocks by manipulating the local variables in such a way that the inner loop only "sees" the current block.
// TODO: If this is used, then the previous declaration (done by generateCwiseOp) of s* is essentially unnecessary.
//       I believe the s* are not used elsewhere (in particular, I don't think they're used in the pre/post parts and "shape" is defined independently), so it would be possible to make defining the s* dependent on what loop method is being used.
function outerFill(matched, order, proc, body) {
  var dimension = order.length
    , nargs = proc.arrayArgs.length
    , blockSize = proc.blockSize
    , has_index = proc.indexArgs.length > 0
    , code = []
  for(var i=0; i<nargs; ++i) {
    code.push(["var offset",i,"=p",i].join(""))
  }
  //Generate loops for unmatched dimensions
  // The order in which these dimensions are traversed is fairly arbitrary (from small stride to large stride, for the first argument)
  // TODO: It would be nice if the order in which these loops are placed would also be somehow "optimal" (at the very least we should check that it really doesn't hurt us if they're not).
  for(var i=matched; i<dimension; ++i) {
    code.push(["for(var j"+i+"=SS[", order[i], "]|0;j", i, ">0;){"].join("")) // Iterate back to front
    code.push(["if(j",i,"<",blockSize,"){"].join("")) // Either decrease j by blockSize (s = blockSize), or set it to zero (after setting s = j).
    code.push(["s",order[i],"=j",i].join(""))
    code.push(["j",i,"=0"].join(""))
    code.push(["}else{s",order[i],"=",blockSize].join(""))
    code.push(["j",i,"-=",blockSize,"}"].join(""))
    if(has_index) {
      code.push(["index[",order[i],"]=j",i].join(""))
    }
  }
  for(var i=0; i<nargs; ++i) {
    var indexStr = ["offset"+i]
    for(var j=matched; j<dimension; ++j) {
      indexStr.push(["j",j,"*t",i,"p",order[j]].join(""))
    }
    code.push(["p",i,"=(",indexStr.join("+"),")"].join(""))
  }
  code.push(innerFill(order, proc, body))
  for(var i=matched; i<dimension; ++i) {
    code.push("}")
  }
  return code.join("\n")
}

//Count the number of compatible inner orders
// This is the length of the longest common prefix of the arrays in orders.
// Each array in orders lists the dimensions of the correspond ndarray in order of increasing stride.
// This is thus the maximum number of dimensions that can be efficiently traversed by simple nested loops for all arrays.
function countMatches(orders) {
  var matched = 0, dimension = orders[0].length
  while(matched < dimension) {
    for(var j=1; j<orders.length; ++j) {
      if(orders[j][matched] !== orders[0][matched]) {
        return matched
      }
    }
    ++matched
  }
  return matched
}

//Processes a block according to the given data types
// Replaces variable names by different ones, either "local" ones (that are then ferried in and out of the given array) or ones matching the arguments that the function performing the ultimate loop will accept.
function processBlock(block, proc, dtypes) {
  var code = block.body
  var pre = []
  var post = []
  for(var i=0; i<block.args.length; ++i) {
    var carg = block.args[i]
    if(carg.count <= 0) {
      continue
    }
    var re = new RegExp(carg.name, "g")
    var ptrStr = ""
    var arrNum = proc.arrayArgs.indexOf(i)
    switch(proc.argTypes[i]) {
      case "offset":
        var offArgIndex = proc.offsetArgIndex.indexOf(i)
        var offArg = proc.offsetArgs[offArgIndex]
        arrNum = offArg.array
        ptrStr = "+q" + offArgIndex // Adds offset to the "pointer" in the array
      case "array":
        ptrStr = "p" + arrNum + ptrStr
        var localStr = "l" + i
        var arrStr = "a" + arrNum
        if (proc.arrayBlockIndices[arrNum] === 0) { // Argument to body is just a single value from this array
          if(carg.count === 1) { // Argument/array used only once(?)
            if(dtypes[arrNum] === "generic") {
              if(carg.lvalue) {
                pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
                code = code.replace(re, localStr)
                post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
              } else {
                code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
              }
            } else {
              code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
            }
          } else if(dtypes[arrNum] === "generic") {
            pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr)
            if(carg.lvalue) {
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
            }
          } else {
            pre.push(["var ", localStr, "=", arrStr, "[", ptrStr, "]"].join("")) // TODO: Could we optimize by checking for carg.rvalue?
            code = code.replace(re, localStr)
            if(carg.lvalue) {
              post.push([arrStr, "[", ptrStr, "]=", localStr].join(""))
            }
          }
        } else { // Argument to body is a "block"
          var reStrArr = [carg.name], ptrStrArr = [ptrStr]
          for(var j=0; j<Math.abs(proc.arrayBlockIndices[arrNum]); j++) {
            reStrArr.push("\\s*\\[([^\\]]+)\\]")
            ptrStrArr.push("$" + (j+1) + "*t" + arrNum + "b" + j) // Matched index times stride
          }
          re = new RegExp(reStrArr.join(""), "g")
          ptrStr = ptrStrArr.join("+")
          if(dtypes[arrNum] === "generic") {
            /*if(carg.lvalue) {
              pre.push(["var ", localStr, "=", arrStr, ".get(", ptrStr, ")"].join("")) // Is this necessary if the argument is ONLY used as an lvalue? (keep in mind that we can have a += something, so we would actually need to check carg.rvalue)
              code = code.replace(re, localStr)
              post.push([arrStr, ".set(", ptrStr, ",", localStr,")"].join(""))
            } else {
              code = code.replace(re, [arrStr, ".get(", ptrStr, ")"].join(""))
            }*/
            throw new Error("cwise: Generic arrays not supported in combination with blocks!")
          } else {
            // This does not produce any local variables, even if variables are used multiple times. It would be possible to do so, but it would complicate things quite a bit.
            code = code.replace(re, [arrStr, "[", ptrStr, "]"].join(""))
          }
        }
      break
      case "scalar":
        code = code.replace(re, "Y" + proc.scalarArgs.indexOf(i))
      break
      case "index":
        code = code.replace(re, "index")
      break
      case "shape":
        code = code.replace(re, "shape")
      break
    }
  }
  return [pre.join("\n"), code, post.join("\n")].join("\n").trim()
}

function typeSummary(dtypes) {
  var summary = new Array(dtypes.length)
  var allEqual = true
  for(var i=0; i<dtypes.length; ++i) {
    var t = dtypes[i]
    var digits = t.match(/\d+/)
    if(!digits) {
      digits = ""
    } else {
      digits = digits[0]
    }
    if(t.charAt(0) === 0) {
      summary[i] = "u" + t.charAt(1) + digits
    } else {
      summary[i] = t.charAt(0) + digits
    }
    if(i > 0) {
      allEqual = allEqual && summary[i] === summary[i-1]
    }
  }
  if(allEqual) {
    return summary[0]
  }
  return summary.join("")
}

//Generates a cwise operator
function generateCWiseOp(proc, typesig) {

  //Compute dimension
  // Arrays get put first in typesig, and there are two entries per array (dtype and order), so this gets the number of dimensions in the first array arg.
  var dimension = (typesig[1].length - Math.abs(proc.arrayBlockIndices[0]))|0
  var orders = new Array(proc.arrayArgs.length)
  var dtypes = new Array(proc.arrayArgs.length)
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    dtypes[i] = typesig[2*i]
    orders[i] = typesig[2*i+1]
  }
  
  //Determine where block and loop indices start and end
  var blockBegin = [], blockEnd = [] // These indices are exposed as blocks
  var loopBegin = [], loopEnd = [] // These indices are iterated over
  var loopOrders = [] // orders restricted to the loop indices
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    if (proc.arrayBlockIndices[i]<0) {
      loopBegin.push(0)
      loopEnd.push(dimension)
      blockBegin.push(dimension)
      blockEnd.push(dimension+proc.arrayBlockIndices[i])
    } else {
      loopBegin.push(proc.arrayBlockIndices[i]) // Non-negative
      loopEnd.push(proc.arrayBlockIndices[i]+dimension)
      blockBegin.push(0)
      blockEnd.push(proc.arrayBlockIndices[i])
    }
    var newOrder = []
    for(var j=0; j<orders[i].length; j++) {
      if (loopBegin[i]<=orders[i][j] && orders[i][j]<loopEnd[i]) {
        newOrder.push(orders[i][j]-loopBegin[i]) // If this is a loop index, put it in newOrder, subtracting loopBegin, to make sure that all loopOrders are using a common set of indices.
      }
    }
    loopOrders.push(newOrder)
  }

  //First create arguments for procedure
  var arglist = ["SS"] // SS is the overall shape over which we iterate
  var code = ["'use strict'"]
  var vars = []
  
  for(var j=0; j<dimension; ++j) {
    vars.push(["s", j, "=SS[", j, "]"].join("")) // The limits for each dimension.
  }
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    arglist.push("a"+i) // Actual data array
    arglist.push("t"+i) // Strides
    arglist.push("p"+i) // Offset in the array at which the data starts (also used for iterating over the data)
    
    for(var j=0; j<dimension; ++j) { // Unpack the strides into vars for looping
      vars.push(["t",i,"p",j,"=t",i,"[",loopBegin[i]+j,"]"].join(""))
    }
    
    for(var j=0; j<Math.abs(proc.arrayBlockIndices[i]); ++j) { // Unpack the strides into vars for block iteration
      vars.push(["t",i,"b",j,"=t",i,"[",blockBegin[i]+j,"]"].join(""))
    }
  }
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    arglist.push("Y" + i)
  }
  if(proc.shapeArgs.length > 0) {
    vars.push("shape=SS.slice(0)") // Makes the shape over which we iterate available to the user defined functions (so you can use width/height for example)
  }
  if(proc.indexArgs.length > 0) {
    // Prepare an array to keep track of the (logical) indices, initialized to dimension zeroes.
    var zeros = new Array(dimension)
    for(var i=0; i<dimension; ++i) {
      zeros[i] = "0"
    }
    vars.push(["index=[", zeros.join(","), "]"].join(""))
  }
  for(var i=0; i<proc.offsetArgs.length; ++i) { // Offset arguments used for stencil operations
    var off_arg = proc.offsetArgs[i]
    var init_string = []
    for(var j=0; j<off_arg.offset.length; ++j) {
      if(off_arg.offset[j] === 0) {
        continue
      } else if(off_arg.offset[j] === 1) {
        init_string.push(["t", off_arg.array, "p", j].join(""))      
      } else {
        init_string.push([off_arg.offset[j], "*t", off_arg.array, "p", j].join(""))
      }
    }
    if(init_string.length === 0) {
      vars.push("q" + i + "=0")
    } else {
      vars.push(["q", i, "=", init_string.join("+")].join(""))
    }
  }

  //Prepare this variables
  var thisVars = uniq([].concat(proc.pre.thisVars)
                      .concat(proc.body.thisVars)
                      .concat(proc.post.thisVars))
  vars = vars.concat(thisVars)
  code.push("var " + vars.join(","))
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    code.push("p"+i+"|=0")
  }
  
  //Inline prelude
  if(proc.pre.body.length > 3) {
    code.push(processBlock(proc.pre, proc, dtypes))
  }

  //Process body
  var body = processBlock(proc.body, proc, dtypes)
  var matched = countMatches(loopOrders)
  if(matched < dimension) {
    code.push(outerFill(matched, loopOrders[0], proc, body)) // TODO: Rather than passing loopOrders[0], it might be interesting to look at passing an order that represents the majority of the arguments for example.
  } else {
    code.push(innerFill(loopOrders[0], proc, body))
  }

  //Inline epilog
  if(proc.post.body.length > 3) {
    code.push(processBlock(proc.post, proc, dtypes))
  }
  
  if(proc.debug) {
    console.log("-----Generated cwise routine for ", typesig, ":\n" + code.join("\n") + "\n----------")
  }
  
  var loopName = [(proc.funcName||"unnamed"), "_cwise_loop_", orders[0].join("s"),"m",matched,typeSummary(dtypes)].join("")
  var f = new Function(["function ",loopName,"(", arglist.join(","),"){", code.join("\n"),"} return ", loopName].join(""))
  return f()
}
module.exports = generateCWiseOp

},{"uniq":5}],4:[function(require,module,exports){
"use strict"

// The function below is called when constructing a cwise function object, and does the following:
// A function object is constructed which accepts as argument a compilation function and returns another function.
// It is this other function that is eventually returned by createThunk, and this function is the one that actually
// checks whether a certain pattern of arguments has already been used before and compiles new loops as needed.
// The compilation passed to the first function object is used for compiling new functions.
// Once this function object is created, it is called with compile as argument, where the first argument of compile
// is bound to "proc" (essentially containing a preprocessed version of the user arguments to cwise).
// So createThunk roughly works like this:
// function createThunk(proc) {
//   var thunk = function(compileBound) {
//     var CACHED = {}
//     return function(arrays and scalars) {
//       if (dtype and order of arrays in CACHED) {
//         var func = CACHED[dtype and order of arrays]
//       } else {
//         var func = CACHED[dtype and order of arrays] = compileBound(dtype and order of arrays)
//       }
//       return func(arrays and scalars)
//     }
//   }
//   return thunk(compile.bind1(proc))
// }

var compile = require("./compile.js")

function createThunk(proc) {
  var code = ["'use strict'", "var CACHED={}"]
  var vars = []
  var thunkName = proc.funcName + "_cwise_thunk"
  
  //Build thunk
  code.push(["return function ", thunkName, "(", proc.shimArgs.join(","), "){"].join(""))
  var typesig = []
  var string_typesig = []
  var proc_args = [["array",proc.arrayArgs[0],".shape.slice(", // Slice shape so that we only retain the shape over which we iterate (which gets passed to the cwise operator as SS).
                    Math.max(0,proc.arrayBlockIndices[0]),proc.arrayBlockIndices[0]<0?(","+proc.arrayBlockIndices[0]+")"):")"].join("")]
  var shapeLengthConditions = [], shapeConditions = []
  // Process array arguments
  for(var i=0; i<proc.arrayArgs.length; ++i) {
    var j = proc.arrayArgs[i]
    vars.push(["t", j, "=array", j, ".dtype,",
               "r", j, "=array", j, ".order"].join(""))
    typesig.push("t" + j)
    typesig.push("r" + j)
    string_typesig.push("t"+j)
    string_typesig.push("r"+j+".join()")
    proc_args.push("array" + j + ".data")
    proc_args.push("array" + j + ".stride")
    proc_args.push("array" + j + ".offset|0")
    if (i>0) { // Gather conditions to check for shape equality (ignoring block indices)
      shapeLengthConditions.push("array" + proc.arrayArgs[0] + ".shape.length===array" + j + ".shape.length+" + (Math.abs(proc.arrayBlockIndices[0])-Math.abs(proc.arrayBlockIndices[i])))
      shapeConditions.push("array" + proc.arrayArgs[0] + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[0]) + "]===array" + j + ".shape[shapeIndex+" + Math.max(0,proc.arrayBlockIndices[i]) + "]")
    }
  }
  // Check for shape equality
  if (proc.arrayArgs.length > 1) {
    code.push("if (!(" + shapeLengthConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same dimensionality!')")
    code.push("for(var shapeIndex=array" + proc.arrayArgs[0] + ".shape.length-" + Math.abs(proc.arrayBlockIndices[0]) + "; shapeIndex-->0;) {")
    code.push("if (!(" + shapeConditions.join(" && ") + ")) throw new Error('cwise: Arrays do not all have the same shape!')")
    code.push("}")
  }
  // Process scalar arguments
  for(var i=0; i<proc.scalarArgs.length; ++i) {
    proc_args.push("scalar" + proc.scalarArgs[i])
  }
  // Check for cached function (and if not present, generate it)
  vars.push(["type=[", string_typesig.join(","), "].join()"].join(""))
  vars.push("proc=CACHED[type]")
  code.push("var " + vars.join(","))
  
  code.push(["if(!proc){",
             "CACHED[type]=proc=compile([", typesig.join(","), "])}",
             "return proc(", proc_args.join(","), ")}"].join(""))

  if(proc.debug) {
    console.log("-----Generated thunk:\n" + code.join("\n") + "\n----------")
  }
  
  //Compile thunk
  var thunk = new Function("compile", code.join("\n"))
  return thunk(compile.bind(undefined, proc))
}

module.exports = createThunk

},{"./compile.js":3}],5:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}],6:[function(require,module,exports){
var iota = require("iota-array")
var isBuffer = require("is-buffer")

var hasTypedArrays  = ((typeof Float64Array) !== "undefined")

function compare1st(a, b) {
  return a[0] - b[0]
}

function order() {
  var stride = this.stride
  var terms = new Array(stride.length)
  var i
  for(i=0; i<terms.length; ++i) {
    terms[i] = [Math.abs(stride[i]), i]
  }
  terms.sort(compare1st)
  var result = new Array(terms.length)
  for(i=0; i<result.length; ++i) {
    result[i] = terms[i][1]
  }
  return result
}

function compileConstructor(dtype, dimension) {
  var className = ["View", dimension, "d", dtype].join("")
  if(dimension < 0) {
    className = "View_Nil" + dtype
  }
  var useGetters = (dtype === "generic")

  if(dimension === -1) {
    //Special case for trivial arrays
    var code =
      "function "+className+"(a){this.data=a;};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return -1};\
proto.size=0;\
proto.dimension=-1;\
proto.shape=proto.stride=proto.order=[];\
proto.lo=proto.hi=proto.transpose=proto.step=\
function(){return new "+className+"(this.data);};\
proto.get=proto.set=function(){};\
proto.pick=function(){return null};\
return function construct_"+className+"(a){return new "+className+"(a);}"
    var procedure = new Function(code)
    return procedure()
  } else if(dimension === 0) {
    //Special case for 0d arrays
    var code =
      "function "+className+"(a,d) {\
this.data = a;\
this.offset = d\
};\
var proto="+className+".prototype;\
proto.dtype='"+dtype+"';\
proto.index=function(){return this.offset};\
proto.dimension=0;\
proto.size=1;\
proto.shape=\
proto.stride=\
proto.order=[];\
proto.lo=\
proto.hi=\
proto.transpose=\
proto.step=function "+className+"_copy() {\
return new "+className+"(this.data,this.offset)\
};\
proto.pick=function "+className+"_pick(){\
return TrivialArray(this.data);\
};\
proto.valueOf=proto.get=function "+className+"_get(){\
return "+(useGetters ? "this.data.get(this.offset)" : "this.data[this.offset]")+
"};\
proto.set=function "+className+"_set(v){\
return "+(useGetters ? "this.data.set(this.offset,v)" : "this.data[this.offset]=v")+"\
};\
return function construct_"+className+"(a,b,c,d){return new "+className+"(a,d)}"
    var procedure = new Function("TrivialArray", code)
    return procedure(CACHED_CONSTRUCTORS[dtype][0])
  }

  var code = ["'use strict'"]

  //Create constructor for view
  var indices = iota(dimension)
  var args = indices.map(function(i) { return "i"+i })
  var index_str = "this.offset+" + indices.map(function(i) {
        return "this.stride[" + i + "]*i" + i
      }).join("+")
  var shapeArg = indices.map(function(i) {
      return "b"+i
    }).join(",")
  var strideArg = indices.map(function(i) {
      return "c"+i
    }).join(",")
  code.push(
    "function "+className+"(a," + shapeArg + "," + strideArg + ",d){this.data=a",
      "this.shape=[" + shapeArg + "]",
      "this.stride=[" + strideArg + "]",
      "this.offset=d|0}",
    "var proto="+className+".prototype",
    "proto.dtype='"+dtype+"'",
    "proto.dimension="+dimension)

  //view.size:
  code.push("Object.defineProperty(proto,'size',{get:function "+className+"_size(){\
return "+indices.map(function(i) { return "this.shape["+i+"]" }).join("*"),
"}})")

  //view.order:
  if(dimension === 1) {
    code.push("proto.order=[0]")
  } else {
    code.push("Object.defineProperty(proto,'order',{get:")
    if(dimension < 4) {
      code.push("function "+className+"_order(){")
      if(dimension === 2) {
        code.push("return (Math.abs(this.stride[0])>Math.abs(this.stride[1]))?[1,0]:[0,1]}})")
      } else if(dimension === 3) {
        code.push(
"var s0=Math.abs(this.stride[0]),s1=Math.abs(this.stride[1]),s2=Math.abs(this.stride[2]);\
if(s0>s1){\
if(s1>s2){\
return [2,1,0];\
}else if(s0>s2){\
return [1,2,0];\
}else{\
return [1,0,2];\
}\
}else if(s0>s2){\
return [2,0,1];\
}else if(s2>s1){\
return [0,1,2];\
}else{\
return [0,2,1];\
}}})")
      }
    } else {
      code.push("ORDER})")
    }
  }

  //view.set(i0, ..., v):
  code.push(
"proto.set=function "+className+"_set("+args.join(",")+",v){")
  if(useGetters) {
    code.push("return this.data.set("+index_str+",v)}")
  } else {
    code.push("return this.data["+index_str+"]=v}")
  }

  //view.get(i0, ...):
  code.push("proto.get=function "+className+"_get("+args.join(",")+"){")
  if(useGetters) {
    code.push("return this.data.get("+index_str+")}")
  } else {
    code.push("return this.data["+index_str+"]}")
  }

  //view.index:
  code.push(
    "proto.index=function "+className+"_index(", args.join(), "){return "+index_str+"}")

  //view.hi():
  code.push("proto.hi=function "+className+"_hi("+args.join(",")+"){return new "+className+"(this.data,"+
    indices.map(function(i) {
      return ["(typeof i",i,"!=='number'||i",i,"<0)?this.shape[", i, "]:i", i,"|0"].join("")
    }).join(",")+","+
    indices.map(function(i) {
      return "this.stride["+i + "]"
    }).join(",")+",this.offset)}")

  //view.lo():
  var a_vars = indices.map(function(i) { return "a"+i+"=this.shape["+i+"]" })
  var c_vars = indices.map(function(i) { return "c"+i+"=this.stride["+i+"]" })
  code.push("proto.lo=function "+className+"_lo("+args.join(",")+"){var b=this.offset,d=0,"+a_vars.join(",")+","+c_vars.join(","))
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'&&i"+i+">=0){\
d=i"+i+"|0;\
b+=c"+i+"*d;\
a"+i+"-=d}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a"+i
    }).join(",")+","+
    indices.map(function(i) {
      return "c"+i
    }).join(",")+",b)}")

  //view.step():
  code.push("proto.step=function "+className+"_step("+args.join(",")+"){var "+
    indices.map(function(i) {
      return "a"+i+"=this.shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "b"+i+"=this.stride["+i+"]"
    }).join(",")+",c=this.offset,d=0,ceil=Math.ceil")
  for(var i=0; i<dimension; ++i) {
    code.push(
"if(typeof i"+i+"==='number'){\
d=i"+i+"|0;\
if(d<0){\
c+=b"+i+"*(a"+i+"-1);\
a"+i+"=ceil(-a"+i+"/d)\
}else{\
a"+i+"=ceil(a"+i+"/d)\
}\
b"+i+"*=d\
}")
  }
  code.push("return new "+className+"(this.data,"+
    indices.map(function(i) {
      return "a" + i
    }).join(",")+","+
    indices.map(function(i) {
      return "b" + i
    }).join(",")+",c)}")

  //view.transpose():
  var tShape = new Array(dimension)
  var tStride = new Array(dimension)
  for(var i=0; i<dimension; ++i) {
    tShape[i] = "a[i"+i+"]"
    tStride[i] = "b[i"+i+"]"
  }
  code.push("proto.transpose=function "+className+"_transpose("+args+"){"+
    args.map(function(n,idx) { return n + "=(" + n + "===undefined?" + idx + ":" + n + "|0)"}).join(";"),
    "var a=this.shape,b=this.stride;return new "+className+"(this.data,"+tShape.join(",")+","+tStride.join(",")+",this.offset)}")

  //view.pick():
  code.push("proto.pick=function "+className+"_pick("+args+"){var a=[],b=[],c=this.offset")
  for(var i=0; i<dimension; ++i) {
    code.push("if(typeof i"+i+"==='number'&&i"+i+">=0){c=(c+this.stride["+i+"]*i"+i+")|0}else{a.push(this.shape["+i+"]);b.push(this.stride["+i+"])}")
  }
  code.push("var ctor=CTOR_LIST[a.length+1];return ctor(this.data,a,b,c)}")

  //Add return statement
  code.push("return function construct_"+className+"(data,shape,stride,offset){return new "+className+"(data,"+
    indices.map(function(i) {
      return "shape["+i+"]"
    }).join(",")+","+
    indices.map(function(i) {
      return "stride["+i+"]"
    }).join(",")+",offset)}")

  //Compile procedure
  var procedure = new Function("CTOR_LIST", "ORDER", code.join("\n"))
  return procedure(CACHED_CONSTRUCTORS[dtype], order)
}

function arrayDType(data) {
  if(isBuffer(data)) {
    return "buffer"
  }
  if(hasTypedArrays) {
    switch(Object.prototype.toString.call(data)) {
      case "[object Float64Array]":
        return "float64"
      case "[object Float32Array]":
        return "float32"
      case "[object Int8Array]":
        return "int8"
      case "[object Int16Array]":
        return "int16"
      case "[object Int32Array]":
        return "int32"
      case "[object Uint8Array]":
        return "uint8"
      case "[object Uint16Array]":
        return "uint16"
      case "[object Uint32Array]":
        return "uint32"
      case "[object Uint8ClampedArray]":
        return "uint8_clamped"
    }
  }
  if(Array.isArray(data)) {
    return "array"
  }
  return "generic"
}

var CACHED_CONSTRUCTORS = {
  "float32":[],
  "float64":[],
  "int8":[],
  "int16":[],
  "int32":[],
  "uint8":[],
  "uint16":[],
  "uint32":[],
  "array":[],
  "uint8_clamped":[],
  "buffer":[],
  "generic":[]
}

;(function() {
  for(var id in CACHED_CONSTRUCTORS) {
    CACHED_CONSTRUCTORS[id].push(compileConstructor(id, -1))
  }
});

function wrappedNDArrayCtor(data, shape, stride, offset) {
  if(data === undefined) {
    var ctor = CACHED_CONSTRUCTORS.array[0]
    return ctor([])
  } else if(typeof data === "number") {
    data = [data]
  }
  if(shape === undefined) {
    shape = [ data.length ]
  }
  var d = shape.length
  if(stride === undefined) {
    stride = new Array(d)
    for(var i=d-1, sz=1; i>=0; --i) {
      stride[i] = sz
      sz *= shape[i]
    }
  }
  if(offset === undefined) {
    offset = 0
    for(var i=0; i<d; ++i) {
      if(stride[i] < 0) {
        offset -= (shape[i]-1)*stride[i]
      }
    }
  }
  var dtype = arrayDType(data)
  var ctor_list = CACHED_CONSTRUCTORS[dtype]
  while(ctor_list.length <= d+1) {
    ctor_list.push(compileConstructor(dtype, ctor_list.length-1))
  }
  var ctor = ctor_list[d+1]
  return ctor(data, shape, stride, offset)
}

module.exports = wrappedNDArrayCtor

},{"iota-array":7,"is-buffer":8}],7:[function(require,module,exports){
"use strict"

function iota(n) {
  var result = new Array(n)
  for(var i=0; i<n; ++i) {
    result[i] = i
  }
  return result
}

module.exports = iota
},{}],8:[function(require,module,exports){
/**
 * Determine if an object is Buffer
 *
 * Author:   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * License:  MIT
 *
 * `npm install is-buffer`
 */

module.exports = function (obj) {
  return !!(
    obj != null &&
    obj.constructor &&
    typeof obj.constructor.isBuffer === 'function' &&
    obj.constructor.isBuffer(obj)
  )
}

},{}],9:[function(require,module,exports){
// Generated by CoffeeScript 1.10.0
(function() {
  var ColorMap, Component, Crosshairs, DataField, DataPanel, Image, Layer, LayerList, SelectComponent, SliderComponent, TextFieldComponent, Threshold, Transform, UserInterface, View, ViewSettings, Viewer, componentToHex, hexToRgb, ndarray, ops, rgbToHex,
    indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    hasProp = {}.hasOwnProperty,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  ndarray = require('ndarray');

  ops = require('ndarray-ops');

  window.Viewer || (window.Viewer = {});


  /* VARIOUS HELPFUL FUNCTIONS */

  window.typeIsArray = Array.isArray || function(value) {
    return {}.toString.call(value) === '[object Array]';
  };

  Array.prototype.diff = function(a) {
    return this.filter(function(i) {
      return !(a.indexOf(i) > -1);
    });
  };

  window.Viewer = Viewer = (function() {
    Viewer.AXIAL = 2;

    Viewer.CORONAL = 1;

    Viewer.SAGITTAL = 0;

    Viewer.XAXIS = 0;

    Viewer.YAXIS = 1;

    Viewer.ZAXIS = 2;

    function Viewer(layerListId, layerSettingClass, cache, options) {
      var xyz;
      this.cache = cache != null ? cache : true;
      if (options == null) {
        options = {};
      }
      xyz = 'xyz' in options ? options.xyz : [0.0, 0.0, 0.0];
      this.coords_ijk = Transform.atlasToImage(xyz);
      this.coords_abc = Transform.atlasToViewer(xyz);
      this.viewSettings = new ViewSettings(options);
      this.views = [];
      this.sliders = {};
      this.dataPanel = new DataPanel(this);
      this.layerList = new LayerList();
      this.userInterface = new UserInterface(this, layerListId, layerSettingClass);
      if (this.cache && (typeof amplify !== "undefined" && amplify !== null)) {
        this.cache = amplify.store;
      }
    }

    Viewer.prototype.coords_xyz = function() {
      return Transform.imageToAtlas(this.coords_ijk);
    };

    Viewer.prototype.paint = function() {
      var len, m, ref, v;
      $(this).trigger("beforePaint");
      if (this.layerList.activeLayer) {
        this.userInterface.updateThresholdSliders(this.layerList.activeLayer.image);
        this.updateDataDisplay();
      }
      ref = this.views;
      for (m = 0, len = ref.length; m < len; m++) {
        v = ref[m];
        v.clear();
        v.paint(this.layerList.layers.slice(0).reverse());
        v.drawCrosshairs();
        v.drawLabels();
      }
      $(this).trigger("afterPaint");
      return true;
    };

    Viewer.prototype.clear = function() {
      var len, m, ref, results, v;
      ref = this.views;
      results = [];
      for (m = 0, len = ref.length; m < len; m++) {
        v = ref[m];
        results.push(v.clear());
      }
      return results;
    };

    Viewer.prototype.resetCanvas = function() {
      var len, m, ref, results, v;
      ref = this.views;
      results = [];
      for (m = 0, len = ref.length; m < len; m++) {
        v = ref[m];
        results.push(v.resetCanvas());
      }
      return results;
    };

    Viewer.prototype.addView = function(element, dim, index, labels) {
      if (labels == null) {
        labels = true;
      }
      return this.views.push(new View(this, this.viewSettings, element, dim, index, labels));
    };

    Viewer.prototype.addSlider = function(name, element, orientation, min, max, value, step, dim, textField) {
      var len, m, results, v, views;
      if (dim == null) {
        dim = null;
      }
      if (textField == null) {
        textField = null;
      }
      if (name.match(/nav/)) {
        views = (function() {
          var len, m, ref, results;
          ref = this.views;
          results = [];
          for (m = 0, len = ref.length; m < len; m++) {
            v = ref[m];
            if (v.dim === dim) {
              results.push(v);
            }
          }
          return results;
        }).call(this);
        results = [];
        for (m = 0, len = views.length; m < len; m++) {
          v = views[m];
          results.push(v.addSlider(name, element, orientation, min, max, value, step, textField));
        }
        return results;
      } else {
        return this.userInterface.addSlider(name, element, orientation, min, max, value, step, textField);
      }
    };

    Viewer.prototype.addTextField = function(name, element) {
      return this.userInterface.addTextField(name, element);
    };

    Viewer.prototype.addDataField = function(name, element) {
      return this.dataPanel.addDataField(name, element);
    };

    Viewer.prototype.addAxisPositionField = function(name, element, dim) {
      return this.dataPanel.addAxisPositionField(name, element, dim);
    };

    Viewer.prototype.addColorSelect = function(element) {
      return this.userInterface.addColorSelect(element);
    };

    Viewer.prototype.addSignSelect = function(element) {
      return this.userInterface.addSignSelect(element);
    };

    Viewer.prototype.addSettingsCheckboxes = function(element, options) {
      var len, m, o, settings;
      if (options === 'standard') {
        options = ['crosshairs', 'panzoom', 'labels'];
      }
      settings = {};
      options = (function() {
        var len, m, results;
        results = [];
        for (m = 0, len = options.length; m < len; m++) {
          o = options[m];
          if (o === 'crosshairs' || o === 'panzoom' || o === 'labels') {
            results.push(o);
          }
        }
        return results;
      })();
      for (m = 0, len = options.length; m < len; m++) {
        o = options[m];
        settings[o] = this.viewSettings[o + 'Enabled'];
      }
      return this.userInterface.addSettingsCheckboxes(element, settings);
    };

    Viewer.prototype._loadImage = function(data, options) {
      var error, error1, layer;
      layer = new Layer(new Image(data), options);
      this.layerList.addLayer(layer, true, options.reference);
      try {
        if (this.cache && options.cache) {
          return amplify.store(layer.name, data);
        }
      } catch (error1) {
        error = error1;
        return "";
      }
    };

    Viewer.prototype._loadImageFromJSON = function(options) {
      return $.getJSON(options.url, (function(_this) {
        return function(data) {
          return _this._loadImage(data, options);
        };
      })(this));
    };

    Viewer.prototype._loadImageFromVolume = function(options) {
      var dfd, r, v;
      dfd = $.Deferred();
      $('body').append("<div id='xtk_tmp' style='display: none;'></div>");
      r = new X.renderer2D();
      r.container = 'xtk_tmp';
      r.orientation = 'X';
      r.init();
      r.interactor.config.KEYBOARD_ENABLED = false;
      r.interactor.config.MOUSECLICKS_ENABLED = false;
      r.interactor.config.MOUSEWHEEL_ENABLED = false;
      r.interactor.init();
      v = new X.volume();
      v.file = options.url += ['&ext=', '?'][+(options.url.indexOf('?') === -1)] + '.nii.gz';
      r.add(v);
      r.render();
      r.onShowtime = (function(_this) {
        return function() {
          var data;
          r.destroy();
          data = {
            data3d: v.image,
            dims: v.dimensions,
            transforms: {
              ijkToRas: v._IJKToRAS,
              rasToIjk: v._RASToIJK
            }
          };
          _this._loadImage(data, options);
          $('#xtk_tmp').remove();
          return dfd.resolve('Finished loading from volume');
        };
      })(this);
      return dfd.promise();
    };

    Viewer.prototype.loadImages = function(images, activate, assignColors) {
      var ajaxReqs, data, existingLayers, img, len, m;
      if (activate == null) {
        activate = null;
      }
      if (assignColors == null) {
        assignColors = true;
      }

      /* Load one or more images. If activate is an integer, activate the layer at that 
      index. Otherwise activate the last layer in the list by default. When assignColors 
      is true, viewer will load each image with the next available color palette unless 
      color is explicitly specified.
       */
      if (!typeIsArray(images)) {
        images = [images];
      }
      ajaxReqs = [];
      existingLayers = this.layerList.getLayerNames();
      images = (function() {
        var len, m, ref, results;
        results = [];
        for (m = 0, len = images.length; m < len; m++) {
          img = images[m];
          if (ref = img.name, indexOf.call(existingLayers, ref) < 0) {
            results.push(img);
          }
        }
        return results;
      })();
      for (m = 0, len = images.length; m < len; m++) {
        img = images[m];
        if (assignColors && (img.colorPalette == null)) {
          img.colorPalette = this.layerList.getNextColor();
        }
        if ((data = img.data) || (this.cache && (data = this.cache(img.name)))) {
          this._loadImage(data, img);
        } else if (img.url.match(/\.json$/) || img.json) {
          ajaxReqs.push(this._loadImageFromJSON(img));
        } else {
          ajaxReqs.push(this._loadImageFromVolume(img));
        }
      }
      return $.when.apply($, ajaxReqs).then((function(_this) {
        return function() {
          var i, order;
          order = (function() {
            var len1, q, results;
            results = [];
            for (q = 0, len1 = images.length; q < len1; q++) {
              i = images[q];
              results.push(i.name);
            }
            return results;
          })();
          _this.sortLayers(order.reverse());
          _this.selectLayer(activate != null ? activate : activate = 0);
          _this.updateUserInterface();
          return $(_this).trigger('imagesLoaded');
        };
      })(this));
    };

    Viewer.prototype.clearImages = function() {
      this.layerList.clearLayers();
      this.updateUserInterface();
      this.clear();
      return $(this).trigger('imagesCleared');
    };

    Viewer.prototype.downloadImage = function(index) {
      var url;
      url = this.layerList.layers[index].download;
      if (url) {
        return window.location.replace(url);
      }
    };

    Viewer.prototype.selectLayer = function(index) {
      this.layerList.activateLayer(index);
      this.userInterface.updateLayerSelection(this.layerList.getActiveIndex());
      this.updateDataDisplay();
      this.userInterface.updateThresholdSliders(this.layerList.activeLayer.image);
      this.userInterface.updateComponents(this.layerList.activeLayer.getSettings());
      return $(this).trigger('layerSelected', this.layerList.activeLayer);
    };

    Viewer.prototype.deleteLayer = function(target) {
      this.layerList.deleteLayer(target);
      this.updateUserInterface();
      return $(this).trigger('layerDeleted');
    };

    Viewer.prototype.toggleLayer = function(index) {
      this.layerList.layers[index].toggle();
      this.userInterface.updateLayerVisibility(this.layerList.getLayerVisibilities());
      this.paint();
      return $(this).trigger('layerToggled');
    };

    Viewer.prototype.sortLayers = function(layers, paint) {
      if (paint == null) {
        paint = false;
      }
      this.layerList.sortLayers(layers);
      this.userInterface.updateLayerVisibility(this.layerList.getLayerVisibilities());
      if (paint) {
        return this.paint();
      }
    };

    Viewer.prototype.updateUserInterface = function() {
      this.userInterface.updateLayerList(this.layerList.layers, this.layerList.getActiveIndex());
      this.userInterface.updateLayerVisibility(this.layerList.getLayerVisibilities());
      this.userInterface.updateLayerSelection(this.layerList.getActiveIndex());
      if (this.layerList.activeLayer != null) {
        this.userInterface.updateComponents(this.layerList.activeLayer.getSettings());
      }
      return this.paint();
    };

    Viewer.prototype.updateSettings = function(settings) {
      this.layerList.updateActiveLayer(settings);
      return this.paint();
    };

    Viewer.prototype.updateDataDisplay = function() {
      var currentCoords, data;
      currentCoords = Transform.imageToAtlas(this.coords_ijk.slice(0)).join(', ');
      data = {
        voxelValue: this.getValue(),
        currentCoords: currentCoords
      };
      return this.dataPanel.update(data);
    };

    Viewer.prototype.updateViewSettings = function(options, paint) {
      if (paint == null) {
        paint = false;
      }
      this.viewSettings.updateSettings(options);
      if (paint) {
        return this.paint();
      }
    };

    Viewer.prototype.moveToViewerCoords = function(dim, cx, cy) {
      var cxyz;
      if (cy == null) {
        cy = null;
      }
      $(this).trigger('beforeLocationChange');
      cxyz = this.viewer2dTo3d(dim, cx, cy);
      this.coords_abc = cxyz;
      this.coords_ijk = Transform.atlasToImage(Transform.viewerToAtlas(this.coords_abc));
      this.paint();
      return $(this).trigger('afterLocationChange', {
        ijk: this.coords_ijk
      });
    };

    Viewer.prototype.moveToAtlasCoords = function(coords, paint) {
      if (paint == null) {
        paint = true;
      }
      this.coords_ijk = Transform.atlasToImage(coords);
      this.coords_abc = Transform.atlasToViewer(coords);
      if (paint) {
        return this.paint();
      }
    };

    Viewer.prototype.deleteView = function(index) {
      return this.views.splice(index, 1);
    };

    Viewer.prototype.jQueryInit = function() {
      return this.userInterface.jQueryInit();
    };

    Viewer.prototype.getValue = function(layer, coords, space, all) {
      var l, ref, x, y, z;
      if (layer == null) {
        layer = null;
      }
      if (coords == null) {
        coords = null;
      }
      if (space == null) {
        space = 'viewer';
      }
      if (all == null) {
        all = false;
      }

      /* Get image value at a specific voxel. By default, returns the currently
      selected voxel for the currently active layer. Optionally, can pass a
      specific layer and/or coordinates (in viewer space) to use. If all is true,
      returns values for all layers as an array.
       */
      if (coords != null) {
        if (space === 'viewer') {
          coords = Transform.viewerToAtlas(coords);
        }
        if (space === 'viewer' || space === 'atlas') {
          coords = Transform.atlasToImage(coords);
        }
        x = coords[0], y = coords[1], z = coords[2];
      } else {
        ref = this.coords_ijk, x = ref[0], y = ref[1], z = ref[2];
      }
      if (all) {
        return (function() {
          var len, m, ref1, results;
          ref1 = this.layerList.layers;
          results = [];
          for (m = 0, len = ref1.length; m < len; m++) {
            l = ref1[m];
            results.push(l.image.data.get(z, y, x));
          }
          return results;
        }).call(this);
      }
      layer = layer != null ? this.layerList.layers[layer] : this.layerList.activeLayer;
      return layer.image.data.get(z, y, x);
    };

    Viewer.prototype.viewer2dTo3d = function(dim, cx, cy) {
      var cxyz;
      if (cy == null) {
        cy = null;
      }
      if (cy != null) {
        cxyz = [cx, cy];
        cxyz.splice(dim, 0, this.coords_abc[dim]);
      } else {
        cxyz = this.coords_abc;
        cxyz[dim] = cx;
      }
      return cxyz;
    };

    Viewer.prototype.setAtlasToViewer = function(cc) {
      return this.coords_abc = Transform.atlasToViewer(cc);
    };

    return Viewer;

  })();

  Image = (function() {
    function Image(data) {
      var i, j, k, len, m, p, q, ref, ref1, ref2, ref3, ref4, ref5, t, u, v, vec;
      ref = data.dims, this.x = ref[0], this.y = ref[1], this.z = ref[2];
      if (data.transforms) {
        this.transforms = {};
        ref1 = data.transforms;
        for (k in ref1) {
          if (!hasProp.call(ref1, k)) continue;
          v = ref1[k];
          this.transforms[k] = ndarray(v, [3, 4]);
        }
      }
      this.data = ndarray(new Float32Array(this.x * this.y * this.z), [this.x, this.y, this.z]);
      if ('data3d' in data) {
        for (i = m = 0, ref2 = this.x; 0 <= ref2 ? m < ref2 : m > ref2; i = 0 <= ref2 ? ++m : --m) {
          for (j = q = 0, ref3 = this.y; 0 <= ref3 ? q < ref3 : q > ref3; j = 0 <= ref3 ? ++q : --q) {
            for (k = t = 0, ref4 = this.z; 0 <= ref4 ? t < ref4 : t > ref4; k = 0 <= ref4 ? ++t : --t) {
              this.data.set(i, j, k, data.data3d[i][j][k]);
            }
          }
        }
      } else if ('values' in data) {
        vec = Transform.jsonToVector(data);
        this.data = ndarray(vec, [this.x, this.y, this.z]);
      }
      this.min = ops.inf(this.data);
      this.max = ops.sup(this.data);
      if ('peaks' in data) {
        ref5 = data.peaks;
        for (u = 0, len = ref5.length; u < len; u++) {
          p = ref5[u];
          this.addSphere(Transform.atlasToImage([p.x, p.y, p.z]), p.r != null ? p.r : p.r = 3, p.value != null ? p.value : p.value = 1);
        }
        this.max = 2;
      }
    }

    Image.prototype.addSphere = function(coords, r, value) {
      var dist, i, j, k, m, q, ref, ref1, ref2, ref3, ref4, ref5, ref6, t, x, y, z;
      if (value == null) {
        value = 1;
      }
      if (r <= 0) {
        return;
      }
      ref = coords.reverse(), x = ref[0], y = ref[1], z = ref[2];
      if (!((x != null) && (y != null) && (z != null))) {
        return;
      }
      for (i = m = ref1 = -r, ref2 = r; ref1 <= ref2 ? m <= ref2 : m >= ref2; i = ref1 <= ref2 ? ++m : --m) {
        if ((x - i) < 0 || (x + i) > (this.x - 1)) {
          continue;
        }
        for (j = q = ref3 = -r, ref4 = r; ref3 <= ref4 ? q <= ref4 : q >= ref4; j = ref3 <= ref4 ? ++q : --q) {
          if ((y - j) < 0 || (y + j) > (this.y - 1)) {
            continue;
          }
          for (k = t = ref5 = -r, ref6 = r; ref5 <= ref6 ? t <= ref6 : t >= ref6; k = ref5 <= ref6 ? ++t : --t) {
            if ((z - k) < 0 || (z + k) > (this.z - 1)) {
              continue;
            }
            dist = i * i + j * j + k * k;
            if (dist < r * r) {
              this.data.set(i + x, j + y, k + z, value);
            }
          }
        }
      }
      return false;
    };

    Image.prototype.resample = function(newx, newy, newz) {};

    Image.prototype.slice = function(dim, index) {
      var slice;
      switch (dim) {
        case 0:
          slice = this.data.pick(null, null, index);
          break;
        case 1:
          slice = this.data.pick(null, index, null);
          break;
        case 2:
          slice = this.data.pick(index, null, null);
      }
      return slice;
    };

    Image.prototype.dims = function() {
      return [this.x, this.y, this.z];
    };

    return Image;

  })();

  Layer = (function() {
    function Layer(image1, options) {
      this.image = image1;
      options = $.extend(true, {
        colorPalette: 'red',
        sign: 'positive',
        visible: true,
        opacity: 1.0,
        cache: false,
        download: false,
        positiveThreshold: 0,
        negativeThreshold: 0,
        description: '',
        intent: 'Intensity'
      }, options);
      this.name = options.name;
      this.sign = options.sign;
      this.visible = options.visible;
      this.threshold = this.setThreshold(options.negativeThreshold, options.positiveThreshold);
      this.opacity = options.opacity;
      this.download = options.download;
      this.intent = options.intent;
      this.description = options.description;
      this.setColorMap(options.colorPalette);
    }

    Layer.prototype.hide = function() {
      return this.visible = false;
    };

    Layer.prototype.show = function() {
      return this.visible = true;
    };

    Layer.prototype.toggle = function() {
      return this.visible = !this.visible;
    };

    Layer.prototype.slice = function(dim) {
      return this.image.slice(dim, viewer.coords_ijk[dim]);
    };

    Layer.prototype.setColorMap = function(palette, steps) {
      var max, maxAbs, min;
      if (palette == null) {
        palette = null;
      }
      if (steps == null) {
        steps = null;
      }
      this.palette = palette;
      if (this.sign === 'both') {

        /* Instead of using the actual min/max range, we find the
        largest absolute value and use that as the bound for
        both signs. This preserves color maps where 0 is
        meaningful; e.g., for hot and cold, we want blues to
        be negative and reds to be positive even when
        abs(min) and abs(max) are quite different.
        BUT if min or max are 0, then implicitly fall back to
        treating mode as if it were 'positive' or 'negative'
         */
        maxAbs = Math.max(this.image.min, this.image.max);
        min = this.image.min === 0 ? 0 : -maxAbs;
        max = this.image.max === 0 ? 0 : maxAbs;
      } else {
        min = this.sign === 'positive' ? 0 : this.image.min;
        max = this.sign === 'negative' ? 0 : this.image.max;
      }
      return this.colorMap = new ColorMap(min, max, palette, steps);
    };

    Layer.prototype.setThreshold = function(negThresh, posThresh) {
      if (negThresh == null) {
        negThresh = 0;
      }
      if (posThresh == null) {
        posThresh = 0;
      }
      return this.threshold = new Threshold(negThresh, posThresh, this.sign);
    };

    Layer.prototype.update = function(settings) {
      var k, nt, pt, v;
      if ('sign' in settings) {
        this.sign = settings['sign'];
      }
      nt = 0;
      pt = 0;
      for (k in settings) {
        v = settings[k];
        switch (k) {
          case 'colorPalette':
            if (this.palette !== v) {
              this.setColorMap(v);
            }
            break;
          case 'opacity':
            if (this.opacity !== v) {
              this.opacity = v;
            }
            break;
          case 'image-intent':
            if (this.intent !== v) {
              this.intent = v;
            }
            break;
          case 'pos-threshold':
            pt = v;
            break;
          case 'neg-threshold':
            nt = v;
            break;
          case 'description':
            if (this.description !== v) {
              this.description = v;
            }
        }
      }
      return this.setThreshold(nt, pt, this.sign);
    };

    Layer.prototype.getSettings = function() {
      var nt, pt, settings;
      nt = this.threshold.negThresh;
      pt = this.threshold.posThresh;
      nt || (nt = 0.0);
      pt || (pt = 0.0);
      settings = {
        colorPalette: this.palette,
        sign: this.sign,
        opacity: this.opacity,
        'image-intent': this.intent,
        'pos-threshold': pt,
        'neg-threshold': nt,
        'description': this.description
      };
      return settings;
    };

    return Layer;

  })();

  LayerList = (function() {
    function LayerList() {
      this.clearLayers();
    }

    LayerList.prototype.addLayer = function(layer, activate, reference) {
      if (activate == null) {
        activate = true;
      }
      if (reference == null) {
        reference = false;
      }
      this.layers.push(layer);
      if (activate) {
        this.activateLayer(this.layers.length - 1);
      }
      if (reference) {
        return this.setReferenceLayer(this.layers.length - 1);
      }
    };

    LayerList.prototype.deleteLayer = function(target) {
      var i, index, l, newInd;
      index = String(target).match(/^\d+$/) ? parseInt(target) : index = ((function() {
        var len, m, ref, results;
        ref = this.layers;
        results = [];
        for (i = m = 0, len = ref.length; m < len; i = ++m) {
          l = ref[i];
          if (l.name === target) {
            results.push(i);
          }
        }
        return results;
      }).call(this))[0];
      this.layers.splice(index, 1);
      if ((this.layers.length != null) && (this.activeLayer == null)) {
        newInd = index === 0 ? 1 : index - 1;
        return this.activateLayer(newInd);
      }
    };

    LayerList.prototype.clearLayers = function() {
      this.layers = [];
      return this.activeLayer = null;
    };

    LayerList.prototype.activateLayer = function(index) {
      return this.activeLayer = this.layers[index];
    };

    LayerList.prototype.updateActiveLayer = function(settings) {
      return this.activeLayer.update(settings);
    };

    LayerList.prototype.setReferenceLayer = function(index) {
      return this.referenceLayer = this.layers[index];
    };

    LayerList.prototype.getLayerNames = function() {
      var l;
      return (function() {
        var len, m, ref, results;
        ref = this.layers;
        results = [];
        for (m = 0, len = ref.length; m < len; m++) {
          l = ref[m];
          results.push(l.name);
        }
        return results;
      }).call(this);
    };

    LayerList.prototype.getLayerVisibilities = function() {
      var l;
      return (function() {
        var len, m, ref, results;
        ref = this.layers;
        results = [];
        for (m = 0, len = ref.length; m < len; m++) {
          l = ref[m];
          results.push(l.visible);
        }
        return results;
      }).call(this);
    };

    LayerList.prototype.getActiveIndex = function() {
      return this.layers.indexOf(this.activeLayer);
    };

    LayerList.prototype.getNextColor = function() {
      var free, l, palettes, used;
      used = (function() {
        var len, m, ref, results;
        ref = this.layers;
        results = [];
        for (m = 0, len = ref.length; m < len; m++) {
          l = ref[m];
          if (l.visible) {
            results.push(l.palette);
          }
        }
        return results;
      }).call(this);
      palettes = Object.keys(ColorMap.PALETTES);
      free = palettes.diff(used);
      if (free.length) {
        return free[0];
      } else {
        return palettes[Math.floor(Math.random() * palettes.length)];
      }
    };

    LayerList.prototype.sortLayers = function(newOrder, destroy, newOnTop) {
      var counter, i, l, len, m, n_layers, n_new, newLayers, ni, ref;
      if (destroy == null) {
        destroy = false;
      }
      if (newOnTop == null) {
        newOnTop = true;
      }
      newLayers = [];
      counter = 0;
      n_layers = this.layers.length;
      n_new = newOrder.length;
      ref = this.layers;
      for (i = m = 0, len = ref.length; m < len; i = ++m) {
        l = ref[i];
        ni = newOrder.indexOf(l.name);
        if (ni < 0) {
          if (destroy) {
            continue;
          } else {
            ni = i;
            if (newOnTop) {
              ni += n_new;
            }
            counter += 1;
          }
        } else if (!(destroy || newOnTop)) {
          ni += counter;
        }
        newLayers[ni] = l;
      }
      return this.layers = newLayers;
    };

    return LayerList;

  })();

  ColorMap = (function() {
    var basic, col, len, m;

    ColorMap.hexToRgb = function(hex) {
      var result;
      result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (result) {
        return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
      } else {
        return [NaN, NaN, NaN];
      }
    };

    ColorMap.componentToHex = function(c) {
      var hex;
      hex = c.toString(16);
      if (hex.length === 1) {
        return "0" + hex;
      } else {
        return hex;
      }
    };

    ColorMap.rgbToHex = function(rgb) {
      return "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);
    };

    ColorMap.PALETTES = {
      grayscale: ['#000000', '#303030', 'gray', 'silver', 'white']
    };

    basic = ['red', 'green', 'blue', 'yellow', 'purple', 'lime', 'aqua', 'navy'];

    for (m = 0, len = basic.length; m < len; m++) {
      col = basic[m];
      ColorMap.PALETTES[col] = ['black', col, 'white'];
    }

    $.extend(ColorMap.PALETTES, {
      'intense red-blue': ['#053061', '#2166AC', '#4393C3', '#F7F7F7', '#D6604D', '#B2182B', '#67001F'],
      'red-yellow-blue': ['#313695', '#4575B4', '#74ADD1', '#FFFFBF', '#F46D43', '#D73027', '#A50026'],
      'brown-teal': ['#003C30', '#01665E', '#35978F', '#F5F5F5', '#BF812D', '#8C510A', '#543005']
    });

    function ColorMap(min1, max1, palette1, steps1) {
      this.min = min1;
      this.max = max1;
      this.palette = palette1 != null ? palette1 : 'hot and cold';
      this.steps = steps1 != null ? steps1 : 40;
      this.range = this.max - this.min;
      this.colors = this.setColors(ColorMap.PALETTES[this.palette]);
    }

    ColorMap.prototype.map = function(data) {
      var c, dims, i, j, q, ref, ref1, res, rgb, t, u, v, val;
      dims = data.shape;
      dims.push(3);
      res = ndarray(new Float32Array(dims[0] * dims[1] * 3), dims);
      for (i = q = 0, ref = data.shape[0]; 0 <= ref ? q < ref : q > ref; i = 0 <= ref ? ++q : --q) {
        for (j = t = 0, ref1 = data.shape[1]; 0 <= ref1 ? t < ref1 : t > ref1; j = 0 <= ref1 ? ++t : --t) {
          v = data.get(i, j);
          if (v === 0) {
            rgb = [NaN, NaN, NaN];
          } else {
            val = this.colors[Math.floor(((v - this.min) / this.range) * this.steps)];
            rgb = ColorMap.hexToRgb(val);
          }
          for (c = u = 0; u < 3; c = ++u) {
            res.set(i, j, c, rgb[c]);
          }
        }
      }
      return res;
    };

    ColorMap.prototype.setColors = function(colors) {
      var i, q, rainbow, ref;
      rainbow = new Rainbow();
      rainbow.setNumberRange(1, this.steps);
      rainbow.setSpectrum.apply(null, colors);
      colors = [];
      for (i = q = 1, ref = this.steps; 1 <= ref ? q < ref : q > ref; i = 1 <= ref ? ++q : --q) {
        colors.push(rainbow.colourAt(i));
      }
      return colors.map(function(c) {
        return "#" + c;
      });
    };

    return ColorMap;

  })();

  Threshold = (function() {
    function Threshold(negThresh1, posThresh1, sign) {
      this.negThresh = negThresh1;
      this.posThresh = posThresh1;
      this.sign = sign != null ? sign : 'both';
    }

    Threshold.prototype.mask = function(data) {
      var i, j, m, q, ref, ref1, res, v, val;
      if (this.posThresh === 0 && this.negThresh === 0 && this.sign === 'both') {
        return data;
      }
      res = ndarray(new Float32Array(data.size), data.shape);
      for (i = m = 0, ref = data.shape[0]; 0 <= ref ? m < ref : m > ref; i = 0 <= ref ? ++m : --m) {
        for (j = q = 0, ref1 = data.shape[1]; 0 <= ref1 ? q < ref1 : q > ref1; j = 0 <= ref1 ? ++q : --q) {
          v = data.get(i, j);
          val = ((this.negThresh < v && v < this.posThresh)) || (v < 0 && this.sign === 'positive') || (v > 0 && this.sign === 'negative') ? 0 : v;
          res.set(i, j, val);
        }
      }
      return res;
    };

    return Threshold;

  })();

  Transform = {
    jsonToVector: function(data) {
      var curr_inds, i, j, m, q, ref, ref1, ref2, t, v;
      v = new Float32Array(data.dims[0] * data.dims[1] * data.dims[2]);
      for (i = m = 0, ref = v.length; 0 <= ref ? m < ref : m > ref; i = 0 <= ref ? ++m : --m) {
        v[i] = 0;
      }
      for (i = q = 0, ref1 = data.values.length; 0 <= ref1 ? q < ref1 : q > ref1; i = 0 <= ref1 ? ++q : --q) {
        curr_inds = data.indices[i];
        for (j = t = 0, ref2 = curr_inds.length; 0 <= ref2 ? t < ref2 : t > ref2; j = 0 <= ref2 ? ++t : --t) {
          v[curr_inds[j] - 1] = data.values[i];
        }
      }
      return v;
    },
    transformCoordinates: function(coords, matrix, round) {
      var ii, jj, m, q, ref, ref1, res;
      if (round == null) {
        round = true;
      }
      coords = coords.slice(0);
      coords.push(1);
      res = [];
      for (ii = m = 0, ref = matrix.shape[0]; 0 <= ref ? m < ref : m > ref; ii = 0 <= ref ? ++m : --m) {
        res[ii] = 0;
        for (jj = q = 0, ref1 = matrix.shape[1]; 0 <= ref1 ? q < ref1 : q > ref1; jj = 0 <= ref1 ? ++q : --q) {
          res[ii] += matrix.get(ii, jj) * coords[jj];
        }
        if (round) {
          res[ii] = Math.round(res[ii]);
        }
      }
      return res;
    },
    viewerToAtlas: function(coords) {
      var matrix;
      matrix = ndarray([180, 0, 0, -90, 0, -218, 0, 90, 0, 0, -180, 108], [3, 4]);
      return this.transformCoordinates(coords, matrix);
    },
    atlasToViewer: function(coords) {
      var matrix;
      matrix = ndarray([1.0 / 180, 0, 0, 0.5, 0, -1.0 / 218, 0, 90.0 / 218, 0, 0, -1.0 / 180, 108.0 / 180], [3, 4]);
      return this.transformCoordinates(coords, matrix, false);
    },
    atlasToImage: function(coords, img) {
      var matrix;
      matrix = ndarray([-0.5, 0, 0, 45, 0, 0.5, 0, 63, 0, 0, 0.5, 36], [3, 4]);
      return this.transformCoordinates(coords, matrix);
    },
    imageToAtlas: function(coords, img) {
      var matrix;
      matrix = ndarray([-2, 0, 0, 90, 0, 2, 0, -126, 0, 0, 2, -72], [3, 4]);
      return this.transformCoordinates(coords, matrix);
    }
  };

  UserInterface = (function() {
    function UserInterface(viewer1, layerListId1, layerSettingClass1) {
      this.viewer = viewer1;
      this.layerListId = layerListId1;
      this.layerSettingClass = layerSettingClass1;
      this.viewSettings = this.viewer.viewSettings;
      this.components = {};
      $(this.layerListId).sortable({
        update: (function(_this) {
          return function() {
            var layers, paint;
            layers = ($('.layer_list_item').map(function() {
              return $(this).text();
            })).toArray();
            return _this.viewer.sortLayers(layers, paint = true);
          };
        })(this)
      });
      $(this.layerSettingClass).change((function(_this) {
        return function(e) {
          return _this.settingsChanged();
        };
      })(this));
    }

    UserInterface.prototype.addSlider = function(name, element, orientation, min, max, value, step, textField) {
      var slider;
      slider = new SliderComponent(this, name, element, orientation, min, max, value, step);
      if (textField != null) {
        this.addTextFieldForSlider(textField, slider);
      }
      return this.components[name] = slider;
    };

    UserInterface.prototype.addTextField = function(name, element) {
      var tf;
      tf = new TextFieldComponent(this, name, element);
      return this.components[name] = tf;
    };

    UserInterface.prototype.addTextFieldForSlider = function(element, slider) {
      var name, tf;
      name = slider.name + '_textField';
      tf = new TextFieldComponent(this, name, element, slider);
      return slider.attachTextField(tf);
    };

    UserInterface.prototype.addColorSelect = function(element) {
      return this.components['colorPalette'] = new SelectComponent(this, 'colorPalette', element, Object.keys(ColorMap.PALETTES));
    };

    UserInterface.prototype.addSignSelect = function(element) {
      return this.components['sign'] = new SelectComponent(this, 'signSelect', element, ['both', 'positive', 'negative']);
    };

    UserInterface.prototype.addSettingsCheckboxes = function(element, settings) {
      var checked, s, v, validSettings;
      $(element).empty();
      validSettings = {
        panzoom: 'Pan/zoom',
        crosshairs: 'Crosshairs',
        labels: 'Labels'
      };
      for (s in settings) {
        v = settings[s];
        if (s in validSettings) {
          checked = v ? ' checked' : '';
          $(element).append("<div class='checkbox_row'><input type='checkbox' class='settings_box' " + checked + " id='" + s + "'>" + validSettings[s] + "</div>");
        }
      }
      return $('.settings_box').change((function(_this) {
        return function(e) {
          return _this.checkboxesChanged();
        };
      })(this));
    };

    UserInterface.prototype.settingsChanged = function() {
      var component, name, ref, settings;
      settings = {};
      ref = this.components;
      for (name in ref) {
        component = ref[name];
        settings[name] = component.getValue();
      }
      return this.viewer.updateSettings(settings);
    };

    UserInterface.prototype.checkboxesChanged = function() {
      var id, len, m, ref, s, settings, val;
      settings = {};
      ref = $('.settings_box');
      for (m = 0, len = ref.length; m < len; m++) {
        s = ref[m];
        id = $(s).attr('id');
        val = $(s).is(':checked') ? true : false;
        settings[id + 'Enabled'] = val;
      }
      return this.viewer.updateViewSettings(settings, true);
    };

    UserInterface.prototype.updateComponents = function(settings) {
      var name, results, value;
      results = [];
      for (name in settings) {
        value = settings[name];
        if (name in this.components) {
          results.push(this.components[name].setValue(value));
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    UserInterface.prototype.updateThresholdSliders = function(image) {
      if ('pos-threshold' in this.components) {
        this.components['pos-threshold'].setRange(0, image.max);
      }
      if ('neg-threshold' in this.components) {
        return this.components['neg-threshold'].setRange(image.min, 0);
      }
    };

    UserInterface.prototype.updateLayerList = function(layers, selectedIndex) {
      var deletion_icon, download_icon, i, l, m, ref, visibility_icon;
      $(this.layerListId).empty();
      for (i = m = 0, ref = layers.length; 0 <= ref ? m < ref : m > ref; i = 0 <= ref ? ++m : --m) {
        l = layers[i];
        visibility_icon = this.viewSettings.visibilityIconEnabled ? "<div class='visibility_icon' title='Hide/show image'><span class='glyphicon glyphicon-eye-open'></i></div>" : '';
        deletion_icon = this.viewSettings.deletionIconEnabled ? "<div class='deletion_icon' title='Remove this layer'><span class='glyphicon glyphicon-trash'></i></div>" : '';
        download_icon = l.download ? "<div class='download_icon' title='Download this image'><span class='glyphicon glyphicon-save'></i></div>" : '';
        $(this.layerListId).append($(("<li class='layer_list_item'>" + visibility_icon + "<div class='layer_label'>") + l.name + ("</div>" + deletion_icon + download_icon + "</li>")));
      }
      $('.layer_label').click((function(_this) {
        return function(e) {
          return _this.viewer.selectLayer($('.layer_label').index(e.target));
        };
      })(this));
      $('.visibility_icon').click((function(_this) {
        return function(e) {
          return _this.toggleLayer($('.visibility_icon').index($(e.target).closest('div')));
        };
      })(this));
      $('.deletion_icon').click((function(_this) {
        return function(e) {
          if (confirm("Are you sure you want to remove this layer?")) {
            return _this.viewer.deleteLayer($('.deletion_icon').index($(e.target).closest('div')));
          }
        };
      })(this));
      $('.download_icon').click((function(_this) {
        return function(e) {
          return _this.viewer.downloadImage($('.download_icon').index($(e.target).closest('div')));
        };
      })(this));
      return $(this.layerListId).val(selectedIndex);
    };

    UserInterface.prototype.updateLayerVisibility = function(visible) {
      var i, m, ref, results;
      if (!this.viewSettings.visibilityIconEnabled) {
        return;
      }
      results = [];
      for (i = m = 0, ref = visible.length; 0 <= ref ? m < ref : m > ref; i = 0 <= ref ? ++m : --m) {
        if (visible[i]) {
          results.push($('.visibility_icon>span').eq(i).removeClass('glyphicon glyphicon-eye-close').addClass('glyphicon glyphicon-eye-open'));
        } else {
          results.push($('.visibility_icon>span').eq(i).removeClass('glyphicon glyphicon-eye-open').addClass('glyphicon glyphicon-eye-close'));
        }
      }
      return results;
    };

    UserInterface.prototype.updateLayerSelection = function(id) {
      $('.layer_label').eq(id).addClass('selected');
      return $('.layer_label').not(":eq(" + id + ")").removeClass('selected');
    };

    UserInterface.prototype.toggleLayer = function(id) {
      return this.viewer.toggleLayer(id);
    };

    return UserInterface;

  })();

  DataPanel = (function() {
    function DataPanel(viewer1) {
      this.viewer = viewer1;
      this.fields = {};
    }

    DataPanel.prototype.addDataField = function(name, element) {
      return this.fields[name] = new DataField(this, name, element);
    };

    DataPanel.prototype.addCoordinateFields = function(name, element) {
      var i, m, target;
      target = $(element);
      for (i = m = 0; m < 2; i = ++m) {
        target.append($("<div class='axis_pos' id='axis_pos_" + axis + "'></div>"));
      }
      return $('axis_pos').change((function(_this) {
        return function(e) {
          var cc, q;
          for (i = q = 0; q < 2; i = ++q) {
            cc = $("#axis_pos_" + i).val();
            _this.viewer.setAtlasToViewer(cc);
            _this.viewer.coords_ijk[i] = cc;
          }
          return _this.viewer.update();
        };
      })(this));
    };

    DataPanel.prototype.update = function(data) {
      var i, k, pos, results, v;
      results = [];
      for (k in data) {
        v = data[k];
        if (k in this.fields) {
          if (k === 'currentCoordsMulti') {
            results.push((function() {
              var results1;
              results1 = [];
              for (pos in v) {
                i = v[pos];
                results1.push($("plane" + i + "_pos").text(pos));
              }
              return results1;
            })());
          } else {
            if (k === 'currentCoords') {
              v = "[" + v + "]";
            }
            results.push($(this.fields[k].element).text(v));
          }
        } else {
          results.push(void 0);
        }
      }
      return results;
    };

    return DataPanel;

  })();

  ViewSettings = (function() {

    /* Stores any settings common to all views--e.g., crosshair preferences,
    dragging/zooming, etc. Individual views can override these settings if view-specific
    options are desired.
     */
    function ViewSettings(options) {
      this.settings = {
        panzoomEnabled: false,
        crosshairsEnabled: true,
        crosshairsWidth: 1,
        crosshairsColor: 'lime',
        labelsEnabled: true,
        visibilityIconEnabled: true,
        deletionIconEnabled: true
      };
      this.updateSettings(options);
    }

    ViewSettings.prototype.updateSettings = function(options) {
      var k, ref, v;
      $.extend(this.settings, options);
      ref = this.settings;
      for (k in ref) {
        v = ref[k];
        this[k] = v;
      }
      return this.crosshairs = new Crosshairs(this.crosshairsEnabled, this.crosshairsColor, this.crosshairsWidth);
    };

    return ViewSettings;

  })();

  View = (function() {
    function View(viewer1, viewSettings, element1, dim1, labels1, slider1) {
      this.viewer = viewer1;
      this.viewSettings = viewSettings;
      this.element = element1;
      this.dim = dim1;
      this.labels = labels1 != null ? labels1 : true;
      this.slider = slider1 != null ? slider1 : null;
      this._handleScroll = bind(this._handleScroll, this);
      this._zoom = bind(this._zoom, this);
      this._canvasMouseMove = bind(this._canvasMouseMove, this);
      this._canvasClick = bind(this._canvasClick, this);
      this.resetCanvas();
      this._jQueryInit();
    }

    View.prototype.addSlider = function(name, element, orientation, min, max, value, step, textField) {
      this.slider = new SliderComponent(this, name, element, orientation, min, max, value, step);
      if (textField != null) {
        return this.viewer.addTextFieldForSlider(textField, this.slider);
      }
    };

    View.prototype.clear = function() {
      var currentState;
      currentState = $.extend(true, {}, this.context.getTransform());
      this.context.reset();
      this.context.fillStyle = 'black';
      this.context.fillRect(0, 0, this.width, this.height);
      return this.context.setTransformFromArray(currentState);
    };

    View.prototype.resetCanvas = function() {
      this.canvas = $(this.element).find('canvas');
      this.width = this.canvas.width();
      this.height = this.canvas.height();
      this.context = this.canvas[0].getContext("2d");
      trackTransforms(this.context);
      this.lastX = this.width / 2;
      this.lastY = this.height / 2;
      this.dragStart = void 0;
      this.scaleFactor = 1.1;
      return this.clear();
    };

    View.prototype.paint = function(layers) {
      var _val, c, data, dims, fuzz, i, img, j, l, ld, len, len1, m, n, q, ref, ref1, t, u, val, vox_rgb, w, xCell, xp, yCell, yp;
      img = layers[0].image;
      dims = [[img.y, img.z], [img.x, img.z], [img.x, img.y]];
      xCell = this.width / dims[this.dim][0];
      yCell = this.height / dims[this.dim][1];
      this.xCell = xCell;
      this.yCell = yCell;
      fuzz = 0.5;
      this.context.lineWidth = 1;
      if (this.width === 0) {
        this.resetCanvas();
      }
      data = [];
      for (m = 0, len = layers.length; m < len; m++) {
        l = layers[m];
        ld = l.slice(this.dim);
        ld = l.threshold.mask(ld);
        data.push(l.colorMap.map(ld));
      }
      for (i = q = 0, ref = data[0].shape[0]; 0 <= ref ? q < ref : q > ref; i = 0 <= ref ? ++q : --q) {
        for (j = t = 0, ref1 = data[0].shape[1]; 0 <= ref1 ? t < ref1 : t > ref1; j = 0 <= ref1 ? ++t : --t) {
          vox_rgb = [];
          for (c = u = 0; u < 3; c = ++u) {
            val = 0.0;
            for (n = w = 0, len1 = layers.length; w < len1; n = ++w) {
              l = layers[n];
              if (l.visible) {
                _val = data[n].get(i, j, c);
                if (isNaN(_val)) {
                  continue;
                }
                val = (_val * l.opacity) + (1.0 - l.opacity) * val;
              }
            }
            val = Math.round(val);
            if (val < 0) {
              val = 0;
            }
            if (val > 255) {
              val = 255;
            }
            vox_rgb[c] = val;
          }
          xp = this.width - (j + 1) * xCell;
          yp = this.height - (i + 1) * yCell;
          this.context.fillStyle = 'rgb(' + vox_rgb.join(', ') + ')';
          this.context.fillRect(xp, yp, xCell + fuzz, yCell + fuzz);
        }
      }
      if (this.slider != null) {
        val = this.viewer.coords_abc[this.dim];
        if (this.dim !== Viewer.XAXIS) {
          val = 1 - val;
        }
        return $(this.slider.element).slider('option', 'value', val);
      }
    };

    View.prototype.drawCrosshairs = function() {
      var ch, xPos, yPos;
      ch = this.viewSettings.crosshairs;
      if (!ch.visible) {
        return;
      }
      this.context.fillStyle = ch.color;
      xPos = this.viewer.coords_abc[[1, 0, 0][this.dim]] * this.width;
      yPos = this.viewer.coords_abc[[2, 2, 1][this.dim]] * this.height;
      this.context.fillRect(0, yPos - ch.width / 2, this.width, ch.width);
      return this.context.fillRect(xPos - ch.width / 2, 0, ch.width, this.height);
    };

    View.prototype.drawLabels = function() {
      var fontSize, planePos, planeText;
      if (!this.viewSettings.labelsEnabled) {
        return;
      }
      fontSize = Math.round(this.height / 15);
      this.context.fillStyle = 'white';
      this.context.font = fontSize + "px Helvetica";
      this.context.textAlign = 'left';
      this.context.textBaseline = 'middle';
      planePos = this.viewer.coords_xyz()[this.dim];
      if (planePos > 0) {
        planePos = '+' + planePos;
      }
      planeText = ['x', 'y', 'z'][this.dim] + ' = ' + planePos;
      this.context.fillText(planeText, 0.03 * this.width, 0.95 * this.height);
      this.context.textAlign = 'center';
      switch (this.dim) {
        case 0:
          this.context.fillText('A', 0.05 * this.width, 0.5 * this.height);
          return this.context.fillText('P', 0.95 * this.width, 0.5 * this.height);
        case 1:
          this.context.fillText('D', 0.95 * this.width, 0.05 * this.height);
          return this.context.fillText('V', 0.95 * this.width, 0.95 * this.height);
        case 2:
          this.context.fillText('L', 0.05 * this.width, 0.05 * this.height);
          return this.context.fillText('R', 0.95 * this.width, 0.05 * this.height);
      }
    };

    View.prototype.navSlideChange = function(value) {
      if (this.dim !== Viewer.XAXIS) {
        value = 1 - value;
      }
      return this.viewer.moveToViewerCoords(this.dim, value);
    };

    View.prototype._snapToGrid = function(x, y) {
      var dims, xVoxSize, yVoxSize;
      dims = [91, 109, 91];
      dims.splice(this.dim, 1);
      xVoxSize = 1 / dims[0];
      yVoxSize = 1 / dims[1];
      x = (Math.floor(x / xVoxSize) + 0.5) * xVoxSize;
      y = (Math.floor(y / yVoxSize) + 0.5) * yVoxSize;
      return {
        x: x,
        y: y
      };
    };

    View.prototype._jQueryInit = function() {
      var canvas;
      canvas = $(this.element).find('canvas');
      canvas.click(this._canvasClick);
      canvas.mousedown((function(_this) {
        return function(evt) {
          document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = "none";
          _this.lastX = evt.offsetX || (evt.pageX - canvas.offset().left);
          _this.lastY = evt.offsetY || (evt.pageY - canvas.offset().top);
          return _this.dragStart = _this.context.transformedPoint(_this.lastX, _this.lastY);
        };
      })(this));
      canvas.mousemove((function(_this) {
        return function(evt) {
          var pt;
          _this._canvasMouseMove(evt);
          if (!_this.viewSettings.panzoomEnabled) {
            return;
          }
          _this.lastX = evt.offsetX || (evt.pageX - canvas.offset().left);
          _this.lastY = evt.offsetY || (evt.pageY - canvas.offset().top);
          if (_this.dragStart) {
            pt = _this.context.transformedPoint(_this.lastX, _this.lastY);
            _this.context.translate(pt.x - _this.dragStart.x, pt.y - _this.dragStart.y);
            return _this.viewer.paint();
          }
        };
      })(this));
      canvas.mouseup((function(_this) {
        return function(evt) {
          return _this.dragStart = null;
        };
      })(this));
      canvas.on("DOMMouseScroll", this._handleScroll);
      return canvas.on("mousewheel", this._handleScroll);
    };

    View.prototype._canvasClick = function(e) {
      var clickX, clickY, cx, cy, pt;
      $(this.viewer).trigger('beforeClick');
      clickX = e.offsetX || (e.pageX - $(this.element).offset().left);
      clickY = e.offsetY || (e.pageY - $(this.element).offset().top);
      pt = this.context.transformedPoint(clickX, clickY);
      cx = pt.x / this.width;
      cy = pt.y / this.height;
      pt = this._snapToGrid(cx, cy);
      this.viewer.moveToViewerCoords(this.dim, pt.x, pt.y);
      return $(this.viewer).trigger('afterClick');
    };

    View.prototype._canvasMouseMove = function(e) {
      var clickX, clickY, cx, cxyz, cy, pt;
      clickX = e.offsetX || (e.pageX - $(this.element).offset().left);
      clickY = e.offsetY || (e.pageY - $(this.element).offset().top);
      pt = this.context.transformedPoint(clickX, clickY);
      cx = pt.x / this.width;
      cy = pt.y / this.height;
      pt = this._snapToGrid(cx, cy);
      cxyz = this.viewer.viewer2dTo3d(this.dim, pt.x, pt.y);
      return $(this.viewer).trigger('mouseMove', {
        ijk: cxyz
      });
    };

    View.prototype._zoom = function(clicks) {
      var factor, pt;
      if (!this.viewSettings.panzoomEnabled) {
        return;
      }
      pt = this.context.transformedPoint(this.lastX, this.lastY);
      this.context.translate(pt.x, pt.y);
      factor = Math.pow(this.scaleFactor, clicks);
      this.context.scale(factor, factor);
      this.context.translate(-pt.x, -pt.y);
      return this.viewer.paint();
    };

    View.prototype._handleScroll = function(evt) {
      var delta, oe;
      oe = evt.originalEvent;
      delta = (oe.wheelDelta ? oe.wheelDelta / 40 : (oe.detail ? -oe.detail : 0));
      if (delta) {
        this._zoom(delta);
      }
      return evt.preventDefault() && false;
    };

    return View;

  })();

  Crosshairs = (function() {
    function Crosshairs(visible1, color, width) {
      this.visible = visible1 != null ? visible1 : true;
      this.color = color != null ? color : 'lime';
      this.width = width != null ? width : 1;
    }

    return Crosshairs;

  })();

  Component = (function() {
    function Component(container, name1, element1) {
      this.container = container;
      this.name = name1;
      this.element = element1;
      $(this.element).change((function(_this) {
        return function(e) {
          return _this.container.settingsChanged();
        };
      })(this));
    }

    Component.prototype.getValue = function() {
      return $(this.element).val();
    };

    Component.prototype.setValue = function(value) {
      return $(this.element).val(value);
    };

    Component.prototype.setEnabled = function(status) {
      status = status ? '' : 'disabled';
      return $(this.element).attr('disabled', status);
    };

    return Component;

  })();

  SliderComponent = (function(superClass) {
    extend(SliderComponent, superClass);

    function SliderComponent(container, name1, element1, orientation1, min1, max1, value1, step1) {
      this.container = container;
      this.name = name1;
      this.element = element1;
      this.orientation = orientation1;
      this.min = min1;
      this.max = max1;
      this.value = value1;
      this.step = step1;
      this.change = bind(this.change, this);
      this.range = this.name.match(/threshold/g) ? 'max' : this.name.match(/nav/g) ? false : 'min';
      this._jQueryInit();
    }

    SliderComponent.prototype.change = function(e, ui) {
      if (this.name.match(/nav/g)) {
        this.container.navSlideChange(ui.value);
      } else {
        this.container.settingsChanged(e);
      }
      return e.stopPropagation();
    };

    SliderComponent.prototype._jQueryInit = function() {
      return $(this.element).slider({
        orientation: this.orientation,
        range: this.range,
        min: this.min,
        max: this.max,
        step: this.step,
        slide: this.change,
        value: this.value
      });
    };

    SliderComponent.prototype.getValue = function() {
      return $(this.element).slider('value');
    };

    SliderComponent.prototype.setValue = function(value) {
      $(this.element).slider('value', value);
      if (this.textField != null) {
        return this.textField.setValue(value);
      }
    };

    SliderComponent.prototype.setRange = function(min1, max1) {
      this.min = min1;
      this.max = max1;
      return $(this.element).slider('option', {
        min: this.min,
        max: this.max
      });
    };

    SliderComponent.prototype.attachTextField = function(textField1) {
      this.textField = textField1;
    };

    return SliderComponent;

  })(Component);

  SelectComponent = (function(superClass) {
    extend(SelectComponent, superClass);

    function SelectComponent(container, name1, element1, options) {
      var len, m, o;
      this.container = container;
      this.name = name1;
      this.element = element1;
      $(this.element).empty();
      for (m = 0, len = options.length; m < len; m++) {
        o = options[m];
        $(this.element).append($('<option></option>').text(o).val(o));
      }
      SelectComponent.__super__.constructor.call(this, this.container, this.name, this.element);
    }

    return SelectComponent;

  })(Component);

  TextFieldComponent = (function(superClass) {
    extend(TextFieldComponent, superClass);

    function TextFieldComponent(container, name1, element1, slider1) {
      this.container = container;
      this.name = name1;
      this.element = element1;
      this.slider = slider1 != null ? slider1 : null;
      if (this.slider != null) {
        this.setValue(this.slider.getValue());
        $(this.element).change((function(_this) {
          return function(e) {
            var v;
            v = _this.getValue();
            if ($.isNumeric(v)) {
              if (v < _this.slider.min) {
                v = _this.slider.min;
              } else if (v > _this.slider.max) {
                v = _this.slider.max;
              }
              _this.setValue(v);
              _this.slider.setValue(v);
              return _this.container.settingsChanged(e);
            }
          };
        })(this));
        $(this.slider.element).on('slide', (function(_this) {
          return function(e) {
            _this.setValue(_this.slider.getValue());
            return e.stopPropagation();
          };
        })(this));
      }
    }

    TextFieldComponent.prototype.setValue = function(value) {
      $(this.element).val(value);
      return $(this.element).text(value);
    };

    return TextFieldComponent;

  })(Component);

  DataField = (function() {
    function DataField(panel, name1, element1) {
      this.panel = panel;
      this.name = name1;
      this.element = element1;
    }

    return DataField;

  })();

  componentToHex = function(c) {
    var hex;
    hex = c.toString(16);
    if (hex.length === 1) {
      return "0" + hex;
    } else {
      return hex;
    }
  };

  rgbToHex = function(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
  };

  hexToRgb = function(hex) {
    var result;
    result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      };
    } else {
      return null;
    }
  };

}).call(this);

},{"ndarray":6,"ndarray-ops":1}]},{},[9]);
