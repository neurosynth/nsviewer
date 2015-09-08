ndarray = require('ndarray')
ops = require('ndarray-ops')
window.Viewer or= {}

### VARIOUS HELPFUL FUNCTIONS ###

# Check if a variable is an array
window.typeIsArray = Array.isArray || ( value ) -> return {}.toString.call( value ) is '[object Array]'
# Call on an array to get elements not contained in the argument array
Array::diff = (a) ->
  @filter (i) ->
    not (a.indexOf(i) > -1)

# Main Viewer class.
# Emphasizes ease of use from the end user's perspective, so there is some
# considerable redundancy here with functionality in other classes--
# e.g., could refactor much of this so users have to create the UserInterface
# class themselves.
window.Viewer = class Viewer

  # Constants
  @AXIAL: 2
  @CORONAL: 1
  @SAGITTAL: 0
  @XAXIS: 0
  @YAXIS: 1
  @ZAXIS: 2

  constructor : (layerListId, layerSettingClass, @cache = true, options = {}) ->

    xyz = if 'xyz' of options then options.xyz else [0.0, 0.0, 0.0]

    # Coordinate frame names: xyz = world; ijk = image; abc = canvas
    @coords_ijk = Transform.atlasToImage(xyz, @layerList.referenceLayer.image)  # initialize at origin
    @coords_abc = Transform.atlasToViewer(xyz)
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

  # Current world coordinates
  coords_xyz: ->
    return Transform.imageToAtlas(@coords_ijk, @layerList.referenceLayer.image)

  paint: ->
    $(@).trigger("beforePaint")
    if @layerList.activeLayer
      @userInterface.updateThresholdSliders(@layerList.activeLayer.image)
      @updateDataDisplay()
    for v in @views
      v.clear()
      # Paint all layers. Note the reversal of layer order to ensure 
      # top layers get painted last.
      v.paint(@layerList.layers.slice(0).reverse())

      # v.paint((l for l in @layerList.layers.slice(0).reverse() if l.visible))
      v.drawCrosshairs()
      v.drawLabels()
    $(@).trigger("afterPaint")
    return true


  clear: ->
    v.clear() for v in @views


  resetCanvas: ->
    v.resetCanvas() for v in @views


  addView: (element, dim, index, labels = true) ->
    @views.push(new View(@, @viewSettings, element, dim, index, labels))


  addSlider: (name, element, orientation, min, max, value, step, dim = null, textField= null) ->
    if name.match(/nav/)
      # Note: we can have more than one view per dimension!
      views = (v for v in @views when v.dim == dim)
      for v in views
        v.addSlider(name, element, orientation, min, max, value, step, textField)
    else
      @userInterface.addSlider(name, element, orientation, min, max, value, step, textField)

  addTextField: (name, element) ->
    @userInterface.addTextField(name, element)

  addDataField: (name, element) ->
    @dataPanel.addDataField(name, element)

  addAxisPositionField: (name, element, dim) ->
    @dataPanel.addAxisPositionField(name, element, dim)


  addColorSelect: (element) ->
    @userInterface.addColorSelect(element)


  addSignSelect: (element) ->
    @userInterface.addSignSelect(element)


  # Add checkboxes for enabling/disabling settings in the ViewSettings object.
  # Element is the HTML element to hold the boxes; settings is an array of 
  # settings to add a box for. If settings == 'standard', create a standard 
  # set of boxes.
  addSettingsCheckboxes: (element, options) ->
    options = ['crosshairs', 'panzoom', 'labels'] if options == 'standard'
    settings = {}
    options = (o for o in options when o in ['crosshairs', 'panzoom', 'labels'])
    for o in options
      settings[o] = @viewSettings[o + 'Enabled']
    @userInterface.addSettingsCheckboxes(element, settings)


  _loadImage: (data, options) ->
    layer = new Layer(new Image(data), options)
    @layerList.addLayer(layer, true, options.reference)
    try
      amplify.store(layer.name, data) if @cache and options.cache
    catch error
      ""


  _loadImageFromJSON: (options) ->
    return $.getJSON(options.url, (data) =>
        @_loadImage(data, options)
      )


  _loadImageFromVolume: (options) ->
    dfd = $.Deferred()
    # xtk requires us to initialize a renderer and draw it to the view,
    # so create a dummy hidden div as the container.
    $('body').append("<div id='xtk_tmp' style='display: none;'></div>")
    r = new X.renderer2D()
    r.container = 'xtk_tmp'
    r.orientation = 'X';
    r.init()
    # Disable all interactions so they don't interfere with other aspects of the app
    r.interactor.config.KEYBOARD_ENABLED = false
    r.interactor.config.MOUSECLICKS_ENABLED = false
    r.interactor.config.MOUSEWHEEL_ENABLED = false
    r.interactor.init()


    v = new X.volume()
    # Kludge: xtk determines which parser to call based on request extension
    v.file = options.url += ['&ext=', '?'][+(options.url.indexOf('?') == -1)] + '.nii.gz'
    r.add v
    r.render()
    r.onShowtime = =>
      r.destroy()
      data = {
        data3d: v.image
        dims: v.dimensions
        transforms: {
          ijkToRas: v._IJKToRAS
          rasToIjk: v._RASToIJK
        }
      }
      @_loadImage(data, options)
      $('#xtk_tmp').remove()
      dfd.resolve('Finished loading from volume')
    return dfd.promise()


  loadImages: (images, activate = null, assignColors = true) ->
    ### Load one or more images. If activate is an integer, activate the layer at that 
    index. Otherwise activate the last layer in the list by default. When assignColors 
    is true, viewer will load each image with the next available color palette unless 
    color is explicitly specified. ###

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
      # Assign next available color
      if assignColors and !img.colorPalette?
        img.colorPalette = @layerList.getNextColor()
      # If image data is already present, or we can retrieve it from the cache,
      # initialize the layer. Otherwise make a JSON call.
      if (data = img.data) or (@cache and (data = @cache(img.name)))
        @_loadImage(data, img)
      # If the url extension is JSON, or json is manually forced by specifying
      # json = true in image options, make ajax call
      else if img.url.match(/\.json$/) or img.json
        ajaxReqs.push(@_loadImageFromJSON(img))
      # Otherwise assume URL points to a volume and load from file
      else
        ajaxReqs.push(@_loadImageFromVolume(img))

    # Reorder layers once asynchronous calls are finished
    $.when.apply($, ajaxReqs).then( =>
      order = (i.name for i in images)
      @sortLayers(order.reverse())
      @selectLayer(activate ?= 0)
      @updateUserInterface()
      $(@).trigger('imagesLoaded')  # Trigger event
    )
        

  clearImages: () ->
    @layerList.clearLayers()
    @updateUserInterface()
    @clear()
    $(@).trigger('imagesCleared')


  downloadImage: (index) ->
    url = @layerList.layers[index].download
    window.location.replace(url) if url


  selectLayer: (index) ->
    @layerList.activateLayer(index)
    @userInterface.updateLayerSelection(@layerList.getActiveIndex())
    @updateDataDisplay()
    @userInterface.updateThresholdSliders(@layerList.activeLayer.image)
    @userInterface.updateComponents(@layerList.activeLayer.getSettings())
    $(@).trigger('layerSelected', @layerList.activeLayer)


  deleteLayer: (target) ->
    @layerList.deleteLayer(target)
    @updateUserInterface()
    $(@).trigger('layerDeleted')


  toggleLayer: (index) ->
    @layerList.layers[index].toggle()
    @userInterface.updateLayerVisibility(@layerList.getLayerVisibilities()) 
    @paint()
    $(@).trigger('layerToggled')


  sortLayers: (layers, paint = false) ->
    @layerList.sortLayers(layers)
    @userInterface.updateLayerVisibility(@layerList.getLayerVisibilities())
    @paint() if paint


  # Call after any operation involving change to layers
  updateUserInterface: () ->
    @userInterface.updateLayerList(@layerList.layers, @layerList.getActiveIndex())
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
    currentCoords = Transform.imageToAtlas(@coords_ijk.slice(0), @layerList.referenceLayer.image)

    data =
      voxelValue: @getValue()
      currentCoords: currentCoords.join(', ')

    @dataPanel.update(data)


  updateViewSettings: (options, paint = false) ->
    @viewSettings.updateSettings(options)
    @paint() if paint


  # Update the current cursor position in 3D space
  moveToViewerCoords: (dim, cx, cy = null) ->
    # If both cx and cy are passed, this is a 2D update from a click()
    # event in the view. Otherwise we update only 1 dimension.
    $(@).trigger('beforeLocationChange')
    cxyz = @viewer2dTo3d(dim, cx, cy)
    @coords_abc = cxyz
    @coords_ijk = Transform.atlasToImage(Transform.viewerToAtlas(@coords_abc), @layerList.referenceLayer.image)
    @paint()
    $(@).trigger('afterLocationChange', {ijk: @coords_ijk})


  moveToAtlasCoords: (coords, paint = true) ->
    @coords_ijk = Transform.atlasToImage(coords, @layerList.referenceLayer.image)
    @coords_abc = Transform.atlasToViewer(coords, @layerList.referenceLayer.image)
    @paint() if paint


  deleteView:  (index) ->
    @views.splice(index, 1)


  jQueryInit: () ->
    @userInterface.jQueryInit()

  getValue: (layer = null, coords = null, space = 'viewer', all = false) ->
    ### Get image value at a specific voxel. By default, returns the currently
    selected voxel for the currently active layer. Optionally, can pass a
    specific layer and/or coordinates (in viewer space) to use. If all is true,
    returns values for all layers as an array. ###
    if coords?
      coords = Transform.viewerToAtlas(coords) if space == 'viewer'
      if space == 'viewer' or space == 'atlas'
        coords = Transform.atlasToImage(coords, @layerList.referenceLayer.image) 
      [x, y, z] = coords
    else
      [x, y, z] = @coords_ijk
    return (l.image.data.get(z, y, x) for l in @layerList.layers) if all
    layer = if layer? then @layerList.layers[layer] else @layerList.activeLayer
    layer.image.data.get(z, y, x)

  # Takes dimension and x/y as input and returns x/y/z viewer coordinates
  viewer2dTo3d: (dim, cx, cy = null) ->
    if cy?
      cxyz = [cx, cy]
      cxyz.splice(dim, 0, @coords_abc[dim])
    else
      cxyz = @coords_abc
      cxyz[dim] = cx
    cxyz

  setAtlasToViewer: (cc) ->
      @coords_abc = Transform.atlasToViewer(cc)
