# This guardfile watches for changes to src/*.coffee, rebuilds viewer.js,
# and copies it into the examples directory so you can automatically
# see your changes.

notification :off

guard :shell do
  watch(%r{^src/.+\.coffee$}) { |m|
    `cake build`
    `cp lib/viewer.js example/js`
  }
end

