
class Image

  constructor: (data) ->

    # Dimensions of image must always be passed
    [@x, @y, @z] = data.dims

    # convert 1d transforms to 3x4 ndarrays
    if data.transforms
        @transforms = {}
        @transforms[k] = ndarray(v, [3,4]) for own k,v of data.transforms

    # Images loaded from a binary volume already have 3D data, and we 
    # just need to clean up values and swap axes (to reverse x and z 
    # relative to xtk).
    @data = ndarray(new Float32Array(@x*@y*@z), [@x, @y, @z])

    if 'data3d' of data
      for i in [0...@x]
        for j in [0...@y]
          for k in [0...@z]
            @data.set(i, j, k, data.data3d[i][j][k])

    # Load from JSON format. The format is kind of clunky and could be improved.
    else if 'values' of data
      vec = Transform.jsonToVector(data)
      @data = ndarray(vec, [@x, @y, @z])

    @min = ops.inf(@data)
    @max = ops.sup(@data)

    # If peaks are passed, construct spheres around them
    if 'peaks' of data
      @addSphere(Transform.atlasToImage([p.x, p.y, p.z]), p.r ?= 3, p.value ?= 1) for p in data.peaks
      @max = 2   # Very strange bug causes problem if @max is < value in addSphere();
             # setting to twice the value seems to work.


  # Add a sphere of radius r at the provided coordinates. Coordinates are specified
  # in image space (i.e., where x/y/z are indexed from 0 to the number of voxels in
  # each plane).
  addSphere: (coords, r, value=1) ->
    return if r <= 0
    [x, y, z] = coords.reverse()
    return unless x? and y? and z?
    for i in [-r..r]
      continue if (x-i) < 0 or (x+i) > (@x - 1)
      for j in [-r..r]
        continue if (y-j) < 0 or (y+j) > (@y - 1)
        for k in [-r..r]
          continue if (z-k) < 0 or (z+k) > (@z - 1)
          dist = i*i + j*j + k*k
          @data.set(i+x, j+y, k+z, value) if dist < r*r
    return false


  # Need to implement resampling to allow display of images of different resolutions
  resample: (newx, newy, newz) ->

  # Slice the volume along the specified dimension (0 = x, 1 = y, 2 = z) at the
  # specified index and return a 2D array.
  slice: (dim, index) ->
    switch dim
      when 0
        slice = @data.pick(null, null, index)
      when 1
        slice = @data.pick(null, index, null)
      when 2
        slice = @data.pick(index, null, null)
    return slice

  dims: ->
    return [@x, @y, @z]


class Layer
  
  # In addition to basic properties we attach to current Layer instance,
  # save the options hash itself. This allows users to extend the 
  # viewer by passing custom options; e.g., images can store a 'download'
  # parameter that indicates whether each image can be downloaded or not.
  constructor: (@image, options) ->

    # Image defaults
    options = $.extend(true, {
      colorPalette: 'red'
      sign: 'positive'
      visible: true
      opacity: 1.0
      cache: false
      download: false
      positiveThreshold: 0
      negativeThreshold: 0
      description: ''
      intent: 'Intensity'  # The meaning of the values in the image
      }, options)

    @name = options.name
    @sign = options.sign
    @visible = options.visible
    @threshold = @setThreshold(options.negativeThreshold, options.positiveThreshold)
    @opacity = options.opacity
    @download = options.download
    @intent = options.intent
    @description = options.description
    @setColorMap(options.colorPalette)

  hide: ->
    @visible = false

  show: ->
    @visible = true

  toggle: ->
    @visible = !@visible

  slice: (dim) ->
    @image.slice(dim, viewer.coords_ijk[dim])

  setColorMap: (palette = null, steps = null) ->
    @palette = palette
    # Color mapping here is a bit non-intuitive, but produces
    # nicer results for the end user.
    if @sign == 'both'
      ### Instead of using the actual min/max range, we find the
      largest absolute value and use that as the bound for
      both signs. This preserves color maps where 0 is
      meaningful; e.g., for hot and cold, we want blues to
      be negative and reds to be positive even when
      abs(min) and abs(max) are quite different.
      BUT if min or max are 0, then implicitly fall back to
      treating mode as if it were 'positive' or 'negative' ###
      maxAbs = Math.max(@image.min, @image.max)
      min = if @image.min == 0 then 0 else -maxAbs
      max = if @image.max == 0 then 0 else maxAbs
    else
      # If user wants just one sign, mask out the other and
      # compress the entire color range into values of one sign.
      min = if @sign == 'positive' then 0 else @image.min
      max = if @sign == 'negative' then 0 else @image.max
    @colorMap = new ColorMap(min, max, palette, steps)
    # @colorData = @colorMap.mapVolume(@image.data)


  setThreshold: (negThresh = 0, posThresh = 0) ->
    @threshold = new Threshold(negThresh, posThresh, @sign)

  # Update the layer's settings from provided object.
  update: (settings) ->

    # Handle settings that take precedence first
    @sign = settings['sign'] if 'sign' of settings

    # Now everything else--ignoring settings that haven't changed
    nt = 0
    pt = 0
    for k, v of settings
      switch k
        when 'colorPalette' then @setColorMap(v) if @palette != v
        when 'opacity' then @opacity = v if @opacity != v
        when 'image-intent' then @intent = v if @intent != v
        when 'pos-threshold' then pt = v
        when 'neg-threshold' then nt = v
        when 'description' then @description = v if @description != v
    @setThreshold(nt, pt, @sign)


  # Return current settings as an object
  getSettings: () ->
    nt = @threshold.negThresh
    pt = @threshold.posThresh
    nt or= 0.0
    pt or= 0.0
    settings =
      colorPalette: @palette
      sign: @sign
      opacity: @opacity
      'image-intent': @intent
      'pos-threshold': pt
      'neg-threshold': nt
      'description': @description
    return settings



# Stores and manages all currently loaded layers.
class LayerList

  constructor: () ->
    @clearLayers()


  # Add a new layer and (optionally) activate it
  addLayer: (layer, activate = true, reference = false) ->
    @layers.push(layer)
    @activateLayer(@layers.length-1) if activate
    @setReferenceLayer(@layers.length-1) if reference


  # Delete the layer at the specified index and activate
  # the one above or below it if appropriate. If target is 
  # an integer, treat as index of layer in array; otherwise 
  # treat as the name of the layer to remove.
  deleteLayer: (target) ->
    index = if String(target).match(/^\d+$/) then parseInt(target)
    else
      index = (i for l, i in @layers when l.name == target)[0]
    @layers.splice(index, 1)
    if @layers.length? and not @activeLayer?
      newInd = if index == 0 then 1 else index - 1
      @activateLayer(newInd)
      

  # Delete all layers
  clearLayers: () ->
    @layers = []
    @activeLayer = null


  # Activate the layer at the specified index
  activateLayer: (index) ->
    @activeLayer = @layers[index]


  # Update the active layer's settings from passed object
  updateActiveLayer: (settings) ->
    @activeLayer.update(settings)

  setReferenceLayer: (index) ->
    @referenceLayer = @layers[index]

  # Return just the names of layers
  getLayerNames: () ->
    return (l.name for l in @layers)


  # Return a boolean array of all layers' visibilities
  getLayerVisibilities: () ->
    return (l.visible for l in @layers)


  # Return the index of the active layer
  getActiveIndex: () ->
    return @layers.indexOf(@activeLayer)


  # Return the next unused color from the palette list. If all 
  # are in use, return a random palette.
  getNextColor: () ->
    used = (l.palette for l in @layers when l.visible)
    palettes = Object.keys(ColorMap.PALETTES)
    free = palettes.diff(used)
    return if free.length then free[0] else palettes[Math.floor(Math.random()*palettes.length)]


  # Resort the layers so they match the order in the input
  # array. Layers in the input are specified by name.
  # If destroy is true, will remove any layers not passed in.
  # Otherwise will preserve the order of unspecified layers,
  # Slotting unspecified layers ahead of specified ones
  # when conflicts arise. If newOnTop is true, new layers
  # will appear above old ones.
  sortLayers: (newOrder, destroy = false, newOnTop = true) ->
    newLayers = []
    counter = 0
    n_layers = @layers.length
    n_new = newOrder.length
    for l, i in @layers
      ni = newOrder.indexOf(l.name)
      if ni < 0
        if destroy
          continue
        else
          ni = i
          ni += n_new if newOnTop
          counter += 1
      else unless (destroy or newOnTop)
        ni += counter
      newLayers[ni] = l
    @layers = newLayers


class ColorMap

  @hexToRgb = (hex) ->
    result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if result
      [parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)]
    else [NaN, NaN, NaN]

  @componentToHex = (c) ->
    hex = c.toString(16)
    (if hex.length is 1 then "0" + hex else hex)

  @rgbToHex = (rgb) ->
    "#" + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2])

  # For now, palettes are hard-coded. Should eventually add facility for
  # reading in additional palettes from file and/or creating them in-browser.
  @PALETTES =
    grayscale: ['#000000','#303030','gray','silver','white']
  # Add monochrome palettes
  basic = ['red', 'green', 'blue', 'yellow', 'purple', 'lime', 'aqua', 'navy']
  for col in basic
    @PALETTES[col] = ['black', col, 'white']
  # Add some other palettes
  $.extend(@PALETTES, {
    'intense red-blue': ['#053061', '#2166AC', '#4393C3', '#F7F7F7', '#D6604D', '#B2182B', '#67001F']
    'red-yellow-blue': ['#313695', '#4575B4', '#74ADD1', '#FFFFBF', '#F46D43', '#D73027', '#A50026']
    'brown-teal': ['#003C30', '#01665E', '#35978F', '#F5F5F5', '#BF812D', '#8C510A', '#543005']
  })

  constructor: (@min, @max, @palette = 'hot and cold', @steps = 40) ->
    @range = @max - @min
    @colors = @setColors(ColorMap.PALETTES[@palette])

  # Map values to colors. Currently uses a linear mapping;  could add option
  # to use other methods.
  map: (data) ->
    dims = data.shape
    dims.push(3)
    res = ndarray(new Float32Array(dims[0] * dims[1] * 3), dims)
    for i in [0...data.shape[0]]
      for j in [0...data.shape[1]]
        v = data.get(i, j)
        if v == 0
          rgb = [NaN, NaN, NaN]
        else
          val = @colors[Math.floor(((v-@min)/@range) * @steps)]
          rgb = ColorMap.hexToRgb(val)
        for c in [0...3]
          res.set(i, j, c, rgb[c])
    return res

  # Takes a set of discrete color names/descriptions and remaps them to
  # a space with @steps different colors.
  setColors: (colors) ->
    rainbow = new Rainbow()
    rainbow.setNumberRange(1, @steps)
    rainbow.setSpectrum.apply(null, colors)
    colors = []
    colors.push rainbow.colourAt(i) for i in [1...@steps]
    return colors.map (c) -> "#" + c


# Provides thresholding/masking functionality.
class Threshold

  constructor: (@negThresh, @posThresh, @sign = 'both') ->


  # Mask out any voxel values below/above thresholds.
  mask: (data) ->
    return data if @posThresh is 0 and @negThresh is 0 and @sign == 'both'
    # Zero out any values below threshold or with wrong sign
    res = ndarray(new Float32Array(data.size), data.shape)
    for i in [0...data.shape[0]]
      for j in [0...data.shape[1]]
        v = data.get(i, j)
        val =
          if (@negThresh < v < @posThresh) or (v < 0 and @sign == 'positive') or (v > 0 and @sign == 'negative') then 0 else v
        res.set(i, j, val)
    return res


# Various transformations between different coordinate frames.
# Note that right now the atlas-related transformations are
# hardcoded for MNI 2x2x2 space; need to generalize this!
Transform =

  # Takes compressed JSON-encoded image data as input and reconstructs
  # into a dense 1D vector, indexed from 0 to the total number of voxels.
  jsonToVector: (data) ->
    v = new Float32Array(data.dims[0] * data.dims[1] * data.dims[2])
    v[i] = 0 for i in [0...v.length]
    for i in [0...data.values.length]
      curr_inds = data.indices[i]
      for j in [0...curr_inds.length]
          v[curr_inds[j] - 1] = data.values[i]
    return(v)

  # Generic coordinate transformation function that takes an input
  # set of coordinates and a matrix to use in the transformation.
  # Assumes matrix is a 3x4 ndarray
  transformCoordinates: (coords, matrix, round = true) ->
    coords = coords.slice(0)  # Don't modify in-place
    coords.push(1)
    res = []
    for ii in [0...matrix.shape[0]]
      res[ii] = 0
      for jj in [0...matrix.shape[1]]
          res[ii] += matrix.get(ii,jj) * coords[jj]
      res[ii] = Math.round(res[ii]) if round

    return res

  # Transformation matrix for viewer space --> atlas (MNI 2mm) space
  viewerToAtlas: (coords) ->
    matrix = ndarray([180, 0, 0, -90, 0, -218, 0, 90, 0, 0, -180, 108], [3,4])
    return @transformCoordinates(coords, matrix)

  # Reduce diemnsions to 
  atlasToViewer: (coords) ->
    matrix = ndarray([1.0/180, 0, 0, 0.5, 0, -1.0/218, 0, 90.0/218, 0, 0, -1.0/180, 108.0/180], [3,4])
    return @transformCoordinates(coords, matrix, false)

  # MC TODO: these are the ones contained in image data
  # Transformation matrix for atlas (MNI 2mm) space --> image (0-indexed) space
  atlasToImage: (coords, img) ->
    matrix = img.transforms['rasToIjk']
    return @transformCoordinates(coords, matrix)

  # Transformation matrix for image space --> atlas (MNI 2mm) space
  imageToAtlas: (coords, img) ->
    matrix = img.transforms['ijkToRas']
    return @transformCoordinates(coords, matrix)
