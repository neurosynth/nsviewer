class SettingsPanel
	
	constructor: (@viewer, @layerListId, @layerSettingClass) ->

		@sliders = {}

		# Make layer list sortable, and update the model after sorting.
		$(@layerListId).sortable({
			update: =>	
				layers = ($('.layer_list_item').map ->
					return $(this).text()
				).toArray()
				@viewer.sortLayers(layers)
		})

		# Add event handlers
		$(@layerSettingClass).change((e) =>
			@settingsChanged()
		)


	addSlider: (name, element, orientation, range, min, max, value, step) ->
		@sliders[name] = new Slider(@, name, element, orientation, range, min, max, value, step)


	addColorSelect: (element) ->
		@colorSelect = element
		$(element).empty()
		for p of ColorMap.PALETTES
			$(element).append($('<option></option>').text(p).val(p))


	# Call when settings change in the view . Extracts all available settings as a hash 
	# and calls the controller to update the layer model. Note that no validation or 
	# scaling of parameters is done here--the view returns all slider values as they 
	# exist in the DOM and these may need to be transformed later.
	settingsChanged: () ->
		settings = {}
		# Get slider values
		for name, slider of @sliders
			settings[name] = $(slider.element).slider('option', 'value')
		# Add other settings
		settings['colorPalette'] = $(@colorSelect).val() if @colorSelect?
		@viewer.updateSettings(settings)

	
	updateComponents: (settings) ->
		$(@colorSelect).val(settings['colorPalette']) if 'colorPalette' of settings
		for k, v of settings
			if k of @sliders
				$(@sliders[k].element).slider('option', 'value', v)


	updateLayerList: (layers, selectedIndex) ->
		$(@layerListId + ',#layer_visible_list').empty()
		for i in [0...layers.length]
			l = layers[i]
			$(@layerListId).append(
				$('<li class="layer_list_item"></li>').text(l)
			)
			$('#layer_visible_list').append(
				$("<i class='icon-eye-open toggle_img' id=#{i}></i>").click (e) =>
					@toggleLayer($(e.target).attr('id'))
			)
		# Add click event handler to all list items
		$('.layer_list_item').click((e) =>
			@viewer.selectLayer($('.layer_list_item').index(e.target))
		)
		$(@layerListId).val(selectedIndex)


	updateLayerVisibility: (visible) ->
		for i in [0...visible.length]
			if visible[i]
				$('.toggle_img').eq(i).removeClass('icon-eye-close').addClass('icon-eye-open')
			else
				$('.toggle_img').eq(i).removeClass('icon-eye-open').addClass('icon-eye-close')


	updateLayerSelection: (id) ->
		$('.layer_list_item').eq(id).addClass('selected')
		$('.layer_list_item').not(":eq(#{id})").removeClass('selected')

		
	toggleLayer: (id) ->
		@viewer.toggleLayer(id)

		
# Presents data to user. Should only include non-interactive fields.
class DataPanel
	
	constructor: ->
		@fields = {}
		

	addDataField: (name, element) ->
		@fields[name] = new DataField(@, name, element)


	update: (data) ->
		for k, v of data
			if k of @fields
				if k == 'currentCoords'
					v = "[#{v}]"
				$(@fields[k].element).text(v) 



class View
	
	constructor: (@element, @dim) ->
		@viewer = $(element).find('canvas')
		@width = @viewer.width()
		@height = @viewer.height()
		@context = @viewer[0].getContext("2d")
		@_jQueryInit()

		
	clear: ->
		@context.fillStyle = 'black'
		@context.fillRect(0, 0, @width, @height)

		
	paint: (layer) ->
		data = layer.slice(this)
		cols = layer.colorMap.map(data)
		img = layer.image
		dims = [[img.y, img.z], [img.x, img.z], [img.x, img.y]]
		xCell = @width / dims[@dim][0]
		yCell = @height / dims[@dim][1]
		@context.globalAlpha = layer.opacity
		for i in [0...dims[@dim][1]]
			for j in [0...dims[@dim][0]]
				continue if typeof data[i][j] is `undefined` | data[i][j] is 0
				xp = @width - (j + 1) * xCell - xCell
				yp = @height - i * yCell
				col = cols[i][j]
				@context.fillStyle = col
				@context.fillRect xp+xCell/2, yp, xCell+1, yCell+1
		@context.globalAlpha = 1.0

				
	crosshairs: (ch) ->
		if ch.visible
			@context.fillStyle = ch.color
			xPos = viewer.cxyz[[1,0,0][@dim]]*@width
			yPos = (viewer.cxyz[[2,2,1][@dim]])*@height
			@context.fillRect 0, yPos - ch.width/2, @width, ch.width
			@context.fillRect xPos - ch.width/2, 0, ch.width, @height

		
	click: (e) =>
		xyz = viewer.coords
		offset = $(e.target).offset()
		cx = e.pageX - offset.left
		cy = e.pageY - offset.top
		cx /= @width
		cy /= @height
		viewer.cxyz = switch @dim
			when 2 then [cx, cy, viewer.cxyz[2]]
			when 1 then [cx, viewer.cxyz[1], cy]
			when 0 then [viewer.cxyz[0], cx, cy]
		coords = viewer.cxyz
		viewer.coords = Transform.atlasToImage(Transform.viewerToAtlas(coords))
		viewer.paint()

			
	_jQueryInit: ->
		$(@element).click @click
	


class Crosshairs

	constructor: (@visible=true, @color='lime', @width=1) ->



class ColorMap

	# For now, palettes are hard-coded. Should eventually add facility for 
	# reading in additional palettes from file and/or creating them in-browser.
	@PALETTES: {
		'hot and cold': ['aqua', '#0099FF', 'blue', 'white', 'red', 'orange', 'yellow'],
		gray: ['#000000','#303030','gray','silver','white'],
		'bright lights': ['blue', 'red', 'yellow', 'green', 'purple'],
		green: ['#006400', '#98FB98', '#ADFF2F']
	}	

	
	constructor: (@min, @max, palette='hot_and_cold', @steps=40) ->
		@range = max - min
		@colors = @setColors(ColorMap.PALETTES[palette])		

			
	# Map values to colors. Currently uses a linear mapping;  could add option 
	# to use other methods.
	map: (data) ->
		res = []
		for i in [0...data.length]
			res[i] = data[i].map (v) =>
				@colors[Math.floor(((v-@min)/@range) * @steps)]
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

		

class Slider

	constructor: (@panel, @name, @element, @orientation, @range, @min, @max, @value, @step) ->
		@_jQueryInit()
		

	change: (e) =>
		@panel.settingsChanged()


	_jQueryInit: ->
		$(@element).slider({
			orientation: @orientation, range: @range, min: @min, max: @max, value: @value, step: @step, slide: @change, change: @change
		})



class DataField

	constructor: (@panel, @name, @element) ->


