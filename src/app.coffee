
window.Viewer or= {}
window.typeIsArray = Array.isArray || ( value ) -> return {}.toString.call( value ) is '[object Array]'

# Singleton pattern--make sure we only ever have one Viewer instance
window.Viewer = class Viewer

  # Constants
  @AXIAL: 2
  @CORONAL: 1
  @SAGITTAL: 0
  @XAXIS: 0
  @YAXIS: 1
  @ZAXIS: 2

  @_instance  = undefined
  @get: (layerListElement, layerSettingClass, cache = true, options = null) ->
    @_instance ?= new _Viewer(layerListElement, layerSettingClass, cache, options)



# Main Viewer class.
# Emphasizes ease of use from the end user's perspective, so there is some
# considerable redundancy here with functionality in other classes--
# e.g., could refactor much of this so users have to create the UserInterface
# class themselves.
class _Viewer

  constructor : (layerListId, layerSettingClass, @cache = true, options) ->
    @coords = Transform.atlasToImage([0, 0, 0])
    @cxyz = Transform.atlasToViewer([0.0, 0.0, 0.0])
    @viewSettings = new ViewSettings(options)
    @views = []
    @sliders = {}
    @dataPanel = new DataPanel(@)
    @layerList = new LayerList()
    @userInterface = new UserInterface(@, layerListId, layerSettingClass)
    @cache = amplify.store if @cache and amplify?
    # keys = @cache()
    # for k of keys
    #   @cache(k, null)


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
      v.drawCrosshairs()
      v.drawLabels()
    return true


  clear: ->
    v.clear() for v in @views


  addView: (element, dim, index, labels = true) ->
    @views.push(new View(@, @viewSettings, element, dim, index, labels))


  addSlider: (name, element, orientation, min, max, value, step, dim = null) ->
    if name.match(/nav/)
      # Note: we can have more than one view per dimension!
      views = (v for v in @views when v.dim == dim)
      for v in views
        v.addSlider(name, element, orientation, min, max, value, step)
    else
      # value = if name.match(/threshold/g) then [min, max] else @cxyz[dim]
      @userInterface.addSlider(name, element, orientation, min, max, value, step)


  addDataField: (name, element) ->
    @dataPanel.addDataField(name, element)

  addAxisPositionField: (name, element, dim) ->
    @dataPanel.addAxisPositionField(name, element, dim)


  addColorSelect: (element) ->
    @userInterface.addColorSelect(element)


  addSignSelect: (element) ->
    @userInterface.addSignSelect(element)


  _loadImage: (data, options) ->
    options = $.extend(true, {
      colorPalette: 'hot and cold'
      sign: 'both'
      cache: false
      }, options)
    layer = new Layer(options.name, new Image(data), options.colorPalette, options.sign)
    @layerList.addLayer(layer)
    try
      amplify.store(layer.name, data) if @cache and options.cache
    catch error
      ""


  _loadImageFromJSON: (options) ->
    return $.getJSON(options.url, (data) =>
        @_loadImage(data, options)
      )


  loadImages: (images, activate = null) ->
    ### Load one or more images. If activate is an integer, activate the layer at that index.
    Otherwise activate the last layer in the list by default. ###

    # Wrap single image in an array
    if not typeIsArray(images)
      images = [images]

    ajaxReqs = []   # Store all ajax requests so we can call a when() on the Promises

    # Remove images that are already loaded. For now, match on name; eventually
    # should find a better way to define uniqueness, or allow user to overwrite
    # existing images.
    existingLayers = @layerList.getLayerNames()
    images = (img for img in images when img.name not in existingLayers)

    for img in images
      # If the data is already passed, or we can retrieve it from the cache,
      # initialize the layer. Otherwise make a JSON call.
      if (data = img.data) or (@cache and (data = @cache(img.name)))
        @_loadImage(data, img)
      else
        ajaxReqs.push(@_loadImageFromJSON(img))
    # Reorder layers once they've all loaded asynchronously
    $.when.apply($, ajaxReqs).then( =>
      order = (i.name for i in images)
      @sortLayers(order.reverse())
      @selectLayer(0)
      @updateUserInterface()
    )


  clearImages: () ->
    @layerList.clearLayers()
    @updateUserInterface()
    @clear()


  selectLayer: (index) ->
    @layerList.activateLayer(index)
    @userInterface.updateLayerSelection(@layerList.getActiveIndex())
    @updateDataDisplay()
    @userInterface.updateComponents(@layerList.activeLayer.getSettings())


  deleteLayer: (index) ->
    @layerList.deleteLayer(index)
    @updateUserInterface()


  toggleLayer: (index) ->
    @layerList.layers[index].toggle()
    @userInterface.updateLayerVisibility(@layerList.getLayerVisibilities())
    @paint()


  sortLayers: (layers, paint = false) ->
    @layerList.sortLayers(layers)
    @userInterface.updateLayerVisibility(@layerList.getLayerVisibilities())
    @paint() if paint


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


  # Update the current cursor position in 3D space
  moveToViewerCoords: (dim, cx, cy = null) ->
    # If both cx and cy are passed, this is a 2D update from a click()
    # event in the view. Otherwise we update only 1 dimension.
    if cy?
      cxyz = [cx, cy]
      cxyz.splice(dim, 0, @cxyz[dim])
    else
      cxyz = @cxyz
      cxyz[dim] = cx
    @cxyz = cxyz
    @coords = Transform.atlasToImage(Transform.viewerToAtlas(@cxyz))
    @paint()


  moveToAtlasCoords: (coords) ->
    @coords = Transform.atlasToImage(coords)
    @cxyz = Transform.atlasToViewer(coords)
    @paint()


  deleteView:  (index) ->
    @views.splice(index, 1)


  jQueryInit: () ->
    @userInterface.jQueryInit()

