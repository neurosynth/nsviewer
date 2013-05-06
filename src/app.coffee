window.Viewer or= {}



# Singleton pattern--make sure we only ever have one Viewer instance
window.Viewer = class Viewer
	
	@_instance  = undefined
	@get: (layerListElement, layerSettingClass, cache = true) ->
		@_instance ?= new _Viewer(layerListElement, layerSettingClass, cache)



# Main Viewer class.
# Emphasizes ease of use from the end user's perspective, so there is some 
# considerable redundancy here with functionality in other classes--
# e.g., could refactor much of this so users have to create the UserInterface
# class themselves.
class _Viewer

	constructor : (layerListId, layerSettingClass, @cache = true) ->
		@coords = Transform.atlasToImage([0, 0, 0])
		@cxyz = Transform.atlasToViewer([0.0, 0.0, 0.0])
		@views = []
		@sliders = {}
		@crosshairs = new Crosshairs()
		@dataPanel = new DataPanel(@)
		@layerList = new LayerList()
		@userInterface = new UserInterface(@, layerListId, layerSettingClass)
		@cache = {} if @cache


	paint: ->
		if @layerList.activeLayer
			al = @layerList.activeLayer
			@updateDataDisplay()
		for v in @views
			v.clear()
			# Paint all layers. Note the reversal of layer order to ensure 
			# top layers get painted last.
			for l in @layerList.layers.slice(0).reverse()
				v.paint(l) if l.visible
			v.drawCrosshairs(@crosshairs)
		return


	clear: ->
		v.clear() for v in @views


	addView: (element, dim, index, labels = true) ->
		@views.push(new View(@, element, dim, index, labels))


	addSlider: (name, element, orientation, range, min, max, value, step) ->
		@userInterface.addSlider(name, element, orientation, range, min, max, value, step)


	addDataField: (name, element) ->
		@dataPanel.addDataField(name, element)

	addAxisPositionField: (name, element, dim) ->
		@dataPanel.addAxisPositionField(name, element, dim)


	addColorSelect: (element) ->
		@userInterface.addColorSelect(element)


	addSignSelect: (element) ->
		@userInterface.addSignSelect(element)


	loadImage: (data, name, colorPalette = 'hot_and_cold', sign = 'both', activate = true) ->
		@layerList.addLayer(new Layer(name, new Image(data), colorPalette, sign), activate)
		@updateUserInterface()


	loadImageFromJSON: (url, name, colorPalette = 'hot_and_cold', sign = 'both', activate = true) ->
		if @cache and url of @cache
			@loadImage(@cache[url], name, colorPalette, sign, activate)
		else
			$.getJSON(url, (data) =>
				@loadImage(data, name, colorPalette, sign, activate)
				@cache[url] = data if @cache
			)


	clearImages: () ->
		@layerList.clearLayers()
		@updateUserInterface()
		@clear()


	selectLayer: (index) ->
		@layerList.activateLayer(index)
		@userInterface.updateLayerSelection(@layerList.getActiveIndex())
		@userInterface.updateComponents(@layerList.activeLayer.getSettings())


	toggleLayer: (index) ->
		@layerList.layers[index].toggle()
		@userInterface.updateLayerVisibility(@layerList.getLayerVisibilities())	
		@paint()


	sortLayers: (layers) ->
		@layerList.sortLayers(layers)
		@userInterface.updateLayerVisibility(@layerList.getLayerVisibilities())
		@paint()


	# Call after any operation involving change to layers
	updateUserInterface: () ->
		@userInterface.updateLayerList(@layerList.getLayerNames(), @layerList.getActiveIndex())
		@userInterface.updateLayerVisibility(@layerList.getLayerVisibilities())
		@userInterface.updateLayerSelection(@layerList.getActiveIndex())
		if @layerList.activeLayer?
			@userInterface.updateComponents(@layerList.activeLayer.getSettings())
		@paint()


	updateSettings: (settings) ->
		@layerList.updateActiveLayer(settings)
		@paint()


	updateDataDisplay: ->
		# Get active layer and extract current value, coordinates, etc.
		activeLayer = @layerList.activeLayer
		[x, y, z] = @coords
		currentValue = activeLayer.image.data[z][y][x]
		currentCoords = Transform.imageToAtlas(@coords.slice(0)).join(', ')

		data =
			voxelValue: currentValue
			currentCoords: currentCoords

		@dataPanel.update(data)


	deleteView:  (index) ->
		@views.splice(index, 1)


	jQueryInit: () ->
		@userInterface.jQueryInit()

