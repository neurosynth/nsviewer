class Image
	
	constructor: (data) ->

		[@max, @min, @x, @y, @z] = [data.max, data.min, data.dims[0], data.dims[1], data.dims[2]]
		vec = Transform.jsonToVector(data)
		@data = Transform.vectorToVolume(vec, [@x, @y, @z])
	
	# Need to implement resampling to allow display of images of different resolutions
	resample: (newx, newy, newz) ->

	# Slice the volume along the specified dimension (0 = z, 1 = x, 2 = y) at the 
	# specified index and return a 2D array.
	slice: (dim, index) ->
		switch dim
	    	when 0
		      slice = []
		      for i in [0...@x]
		        slice[i] = []
		        for j in [0...@y]
		          slice[i][j] = @data[i][j][index]
		    when 1
		      slice = []
		      for i in [0...@x]
		        slice[i] = @data[i][index]
		      slice
		    when 2
		      slice = @data[index]
		return slice
	
	dims: ->
		return [@x, @y, @z]
		


class Layer
	
	constructor: (@name, @image, palette='hot_and_cold') ->
		@visible = true
		@threshold = @setThreshold(0, 0)
		@colorMap = @setColorMap(palette)
		@opacity = 1.0
		

	hide: ->
		@visible = false
	

	show: ->
		@visible = true

		
	toggle: ->
		@visible = !@visible

		
	slice: (view) ->
		# get the right 2D slice from the Image
		data = @image.slice(view.dim, viewer.coords[view.dim])
		# Threshold if needed
		data = @threshold.mask(data)
		return data

		
	setColorMap: (palette = null, steps = null) ->
		@palette = palette
		@colorMap = new ColorMap(@image.min, @image.max, palette, steps)

		
	setThreshold: (negThresh = 0, posThresh = 0) ->
		@threshold = new Threshold(negThresh, posThresh)


	# Update the layer's settings from provided object.
	update: (settings) ->
		nt = 0
		pt = 0
		for k, v of settings
			switch k
				when 'colorPalette' then @setColorMap(v)
				when 'opacity' then @opacity = v
				when 'pos-threshold' then pt = v * @image.max
				when 'neg-threshold' then nt = v * @image.min
		@setThreshold(nt, pt)


	# Return current settings as an object
	getSettings: () ->
		nt = @threshold.negThresh / @image.min
		pt = @threshold.posThresh / @image.max
		settings =
			colorPalette: @palette
			opacity: @opacity
			'pos-threshold': pt
			'neg-threshold': nt
		return settings



# Stores and manages all currently loaded layers.
class LayerList

	constructor: () ->
		@layers = []
		@activeLayer = null


	# Add a new layer and (optionally) activate it
	addLayer: (layer, activate = true) ->
		@layers.push(layer)
		@activateLayer(@layers.length-1) if activate


	# Delete the layer at the specified index
	deleteLayer: (index) ->
		@layers.splice(index, 1)


	# Activate the layer at the specified index			
	activateLayer: (index) ->
		@activeLayer = @layers[index]


	# Update the active layer's settings from passed object
	updateActiveLayer: (settings) ->
		@activeLayer.update(settings)


	# Return just the names of layers
	getLayerNames: () ->
		return (l.name for l in @layers)


	# Return a boolean array of all layers' visibilities
	getLayerVisibilities: () ->
		return (l.visible for l in @layers)


	# Return the index of the active layer
	getActiveIndex: () ->
		return @layers.indexOf(@activeLayer)


	# Resort the layers so they match the order in the input
	# array. Layers in the input are specified by name.
	sortLayers: (newOrder) ->
		newLayers = []
		for l in @layers
			i = newOrder.indexOf(l.name)
			newLayers[i] = l
		@layers = newLayers



# Provides thresholding/masking functionality.
class Threshold
	
	constructor: (@negThresh, @posThresh) ->

	
	# Mask out any voxel values below/above thresholds.		
	mask: (data) ->
		return data if @posThresh is 0 and @negThresh is 0
		# Zero out any values below threshold
		res = []
		for i in [0...data.length]
			res[i] = data[i].map (v) =>
				if @negThresh < v < @posThresh then 0 else v
		return res
	

# Various transformations between different coordinate frames.
# Note that right now the atlas-related transformations are 
# hardcoded for MNI 2x2x2 space; need to generalize this!
Transform =

	# Takes compressed JSON-encoded image data as input and reconstructs 
	# into a dense 1D vector, indexed from 0 to the total number of voxels.
	jsonToVector: (data) ->
		v = new Array(data.dims[0] * data.dims[1] * data.dims[2])
		v[i] = 0 for i in [0...v.length]
		for i in [0...data.values.length]
			curr_inds = data.indices[i]
			for j in [0...curr_inds.length]
		    	v[curr_inds[j] - 1] = data.values[i]
		return(v)

	# Reshape a 1D vector of all voxels into a 3D volume with specified dims.
	vectorToVolume: (vec, dims) ->
		vol = []
		for i in [0...dims[0]]
			vol[i] = []
			for j in [0...dims[1]]
				vol[i][j] = []
				for k in [0...dims[2]]
					vol[i][j][k] = 0
					sliceSize = dims[1] * dims[2]
		for i in [0...vec.length]
			continue if typeof vec[i] is `undefined`
			x = Math.floor(i / sliceSize)
			y = Math.floor((i - (x * sliceSize)) / dims[2])
			z = i - (x * sliceSize) - (y * dims[2])
			vol[x][y][z] = vec[i]
		return(vol)

	# Generic coordinate transformation function that takes an input 
	# set of coordinates and a matrix to use in the transformation.
	# Depends on the Sylvester library.
	transformCoordinates: (coords, matrix, round = true) ->
		m = $M(matrix)
		coords.push(1)
		v = $V(coords)
		res = []
		m.x(v).each (e) -> 
			e = Math.floor(e) if round
			res.push(e)
		return res

	# Transformation matrix for viewer space --> atlas (MNI 2mm) space
	viewerToAtlas: (coords) ->
		matrix = [[180, 0, 0, -90], [0, -218, 0, 90], [0, 0, -180, 108]]
		return @transformCoordinates(coords, matrix)

	atlasToViewer: (coords) ->
		matrix = [[1.0/180, 0, 0, 0.5], [0, -1.0/218, 0, 90.0/218], [0, 0, -1.0/180, 108.0/180]]
		return @transformCoordinates(coords, matrix, false)

	# Transformation matrix for atlas (MNI 2mm) space --> image (0-indexed) space
	atlasToImage: (coords) ->
		matrix = [[-0.5, 0, 0, 45], [0, 0.5, 0, 63], [0, 0, 0.5, 36]]
		return @transformCoordinates(coords, matrix)

	# Transformation matrix for image space --> atlas (MNI 2mm) space
	imageToAtlas: (coords) ->
		matrix = [[-2, 0, 0, 90], [0, 2, 0, -126], [0, 0, 2, -72]]
		return @transformCoordinates(coords, matrix)

