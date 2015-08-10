fs     = require 'fs'
{exec} = require 'child_process'

task 'build', 'Concatenate and compile', ->
  exec 'coffee --join lib/coffee.js --compile src/*.coffee'