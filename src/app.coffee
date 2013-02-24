window.Viewer or= {}



# Singleton pattern--make sure we only ever have one Viewer instance
window.Viewer = class Viewer
	
	@_instance  = undefined
	@get: (layerListElement, layerSettingClass) ->
		@_instance ?= new _Viewer(layerListElement, layerSettingClass)



# Main Viewer class.
# Emphasizes ease of use from the end user's perspective, so there is some 
# considerable redundancy here with functionality in other classes--
# e.g., could refactor much of this so users have to create the SettingsPanel
# class themselves.
class _Viewer

	constructor : (layerListId, layerSettingClass) ->
		@coords = Transform.atlasToImage([0, 0, 0])
		@cxyz = Transform.atlasToViewer([0.0, 0.0, 0.0])
		@views = []
		@sliders = {}
		@crosshairs = new Crosshairs()
		@dataPanel = new DataPanel()
		@layerList = new LayerList()
		@settingsPanel = new SettingsPanel(@, layerListId, layerSettingClass)


	paint: ->
		if @layerList.activeLayer
			al = @layerList.activeLayer
			@updateDataDisplay()
		for v in @views
			v.clear()
			# Paint all layers. Note the reversal of layer order to ensure 
			# top layers get painted last.
			for l in @layerList.layers.slice(0).reverse()
				v.paint(l)  if l.visible
			v.crosshairs(@crosshairs)
		return


	clear: ->
		v.clear() for v in @views


	addView: (element, dim, index) ->
		@views.push(new View(element, dim, index))


	addSlider: (name, element, orientation, range, min, max, value, step) ->
		@settingsPanel.addSlider(name, element, orientation, range, min, max, value, step)


	addDataField: (name, element) ->
		@dataPanel.addDataField(name, element)


	addColorSelect: (element) ->
		@settingsPanel.addColorSelect(element)


	loadImage: (data, name, colorPalette = 'hot_and_cold', activate = true) ->
		@layerList.addLayer(new Layer(name, new Image(data), colorPalette), activate)
		@settingsPanel.updateLayerList(@layerList.getLayerNames(), @layerList.getActiveIndex())
		@settingsPanel.updateLayerVisibility(@layerList.getLayerVisibilities())
		@settingsPanel.updateLayerSelection(@layerList.getActiveIndex())
		@settingsPanel.updateComponents(@layerList.activeLayer.getSettings())
		@paint()


	loadImageFromJSON: (dataSource, name, colorPalette = 'hot_and_cold', activate = true) ->
		$.getJSON(dataSource, (data) =>
			@loadImage(data, name, colorPalette, activate)
		)


	selectLayer: (index) ->
		@layerList.activateLayer(index)
		@settingsPanel.updateLayerSelection(@layerList.getActiveIndex())
		@settingsPanel.updateComponents(@layerList.activeLayer.getSettings())


	toggleLayer: (index) ->
		@layerList.layers[index].toggle()
		@settingsPanel.updateLayerVisibility(@layerList.getLayerVisibilities())	
		@paint()


	sortLayers: (layers) ->
		@layerList.sortLayers(layers)
		@settingsPanel.updateLayerVisibility(@layerList.getLayerVisibilities())
		@paint()


	updateSettings: (settings) ->
		@layerList.updateActiveLayer(settings)
		@paint()


	updateDataDisplay: ->
		# Get active layer and extract current value, coordinates, etc.
		activeLayer = @layerList.activeLayer
		[x, y, z] = @coords
		currentValue = activeLayer.image.data[z][y][x]
		currentCoords = Transform.imageToAtlas(viewer.coords.slice(0)).join(', ')

		data =
			voxelValue: currentValue
			currentCoords: currentCoords

		@dataPanel.update(data)


	deleteView:  (index) ->
		@views.splice(index, 1)


	jQueryInit: () ->
		@settingsPanel.jQueryInit()

