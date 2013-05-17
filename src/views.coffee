class UserInterface
    
    constructor: (@viewer, @layerListId, @layerSettingClass) ->

        @sliders = {}

        # Make layer list sortable, and update the model after sorting.
        $(@layerListId).sortable({
            update: =>  
                layers = ($('.layer_list_item').map ->
                    return $(this).text()
                ).toArray()
                @viewer.sortLayers(layers, paint = true)
        })

        # Add event handlers
        $(@layerSettingClass).change((e) =>
            @settingsChanged()
        )


    addSlider: (name, element, orientation, min, max, value, step, dim) ->
        @sliders[name] = new Slider(@, name, element, orientation, min, max, value, step, dim)


    addColorSelect: (element) ->
        @colorSelect = element
        $(element).empty()
        for p of ColorMap.PALETTES
            $(element).append($('<option></option>').text(p).val(p))


    addSignSelect: (element) ->
        @signSelect = element
        $(element).empty()
        for p in ['both', 'positive', 'negative']
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
        settings['sign'] = $(@signSelect).val() if @signSelect?
        @viewer.updateSettings(settings)


    # Sync all components (i.e., UI elements) with model.
    updateComponents: (settings) ->
        $(@colorSelect).val(settings['colorPalette']) if 'colorPalette' of settings
        $(@signSelect).val(settings['sign']) if 'sign' of settings
        for k, v of settings
            if k of @sliders
                $(@sliders[k].element).slider('option', 'value', v)


    # Update the list of layers in the view from an array of names and selects
    # the selected layer by index.
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


    # Update the eye closed/open icons in the list based on their current visibility
    updateLayerVisibility: (visible) ->
        for i in [0...visible.length]
            if visible[i]
                $('.toggle_img').eq(i).removeClass('icon-eye-close').addClass('icon-eye-open')
            else
                $('.toggle_img').eq(i).removeClass('icon-eye-open').addClass('icon-eye-close')


    # Sync the selected layer with the view
    updateLayerSelection: (id) ->
        $('.layer_list_item').eq(id).addClass('selected')
        $('.layer_list_item').not(":eq(#{id})").removeClass('selected')

    
    # Toggle the specified layer's visibility
    toggleLayer: (id) ->
        @viewer.toggleLayer(id)


        
# Presents data to user. Should only include non-interactive fields.
class DataPanel
    
    constructor: (@viewer) ->
        @fields = {}
        

    addDataField: (name, element) ->
        @fields[name] = new DataField(@, name, element)


    addCoordinateFields: (name, element) ->
        target = $(element)
        # Insert elements for x/y/z update fields
        for i in [0...2]
            target.append($("<div class='axis_pos' id='axis_pos_#{axis}'></div>"))
        # Add change handler--when any axis changes, update all coordinates
        $('axis_pos').change((e) =>
            for i in [0...2]
                cc = $("#axis_pos_#{i}").val()  # Get current position
                # TODO: ADD VALIDATION--NEED TO ROUND TO NEAREST VALID POSITION
                #       AND MAKE SURE WE'RE WITHIN BOUNDS
                @viewer.cxyz[i] = Transform.atlasToViewer(cc)
                @viewer.coords[i] = cc
            @viewer.update()  # Fix
        )


    update: (data) ->
        for k, v of data
            if k of @fields
                # For multi-field coordinate representation, assign each plane
                if k == 'currentCoordsMulti'
                    for pos, i of v
                        $("plane#{i}_pos").text(pos)
                # Otherwise just set value, handling special cases appropriately
                else
                    if k == 'currentCoords'
                        v = "[#{v}]"
                    $(@fields[k].element).text(v)



class ViewSettings

    ### Stores any settings common to all views--e.g., crosshair preferences,
    dragging/zooming, etc. Individual views can override these settings if view-specific 
    options are desired. ###

    constructor: (options) ->
        # Defaults
        settings = $.extend({
            panEnabled: true
            zoomEnabled: true
            crosshairsEnabled: true
            crosshairsWidth: 1
            crosshairsColor: 'lime'
        }, options)
        for k, v of settings
            @[k] = v
        @crosshairs = new Crosshairs(@crosshairsEnabled, @crosshairsColor, @crosshairsWidth)



class View

    constructor: (@viewer, @viewSettings, @element, @dim, @labels = true, @slider = null) ->
        @canvas = $(@element).find('canvas')
        @width = @canvas.width()
        @height = @canvas.height()
        @context = @canvas[0].getContext("2d")
        @lastX = @width / 2
        @lastY = @height / 2
        @dragStart = undefined
        @scaleFactor = 1.1
        @_jQueryInit()
        trackTransforms(@context)


    # Add a nav slider
    addSlider: (name, element, orientation, min, max, value, step, dim) ->
        @slider = new Slider(@, name, element, orientation, min, max, value, step, dim)

        
    clear: ->
        # Temporarily reset the context state, blank the view, then restore state
        currentState = $.extend(true, {}, @context.getTransform())  # Deep copy
        @context.reset()
        @context.fillStyle = 'black'
        @context.fillRect(0, 0, @width, @height)
        @context.setTransformFromArray(currentState)

        
    paint: (layer) ->
        data = layer.slice(this, @viewer)
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
        if @slider?
            val = @viewer.cxyz[@dim]
            val = (1 - val) unless @dim == Viewer.XAXIS 
            $(@slider.element).slider('option', 'value', val)
        # Add orienting labels
        # @drawLabels() if @labels

                
    drawCrosshairs: () ->
        ch = @viewSettings.crosshairs
        if ch.visible
            @context.fillStyle = ch.color
            xPos = @viewer.cxyz[[1,0,0][@dim]]*@width
            yPos = (@viewer.cxyz[[2,2,1][@dim]])*@height
            @context.fillRect 0, yPos - ch.width/2, @width, ch.width
            @context.fillRect xPos - ch.width/2, 0, ch.width, @height


    # Add orientation labels to X/Y/Z slices
    drawLabels: ->


    # Pass through data from a nav slider event to the viewer for position update
    navSlideChange: (value) ->
        value = (1 - value) unless @dim == Viewer.XAXIS
        @viewer.updatePosition(@dim, value)


    # Kludgy way of applying a grid; in future this should be abstracted 
    # away into a ViewSettings class that stores all the dimension/orientation
    # info and returns dynamic transformation methods.
    _snapToGrid: (x, y) ->
        dims = [91, 109, 91]
        dims.splice(@dim, 1)
        xVoxSize = 1 / dims[0]
        yVoxSize = 1 / dims[1]
        x = Math.floor(x/xVoxSize)*xVoxSize + 0.5*xVoxSize
        y = Math.floor((y + 0.5*yVoxSize)/yVoxSize)*yVoxSize #+ 0.5*yVoxSize
        return { x: x, y: y }

            
    _jQueryInit: ->
        canvas = $(@element).find('canvas')
        canvas.click @_canvasClick
        canvas.mousedown((evt) =>
            document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = "none"
            @lastX = evt.offsetX or (evt.pageX - canvas.offsetLeft)
            @lastY = evt.offsetY or (evt.pageY - canvas.offsetTop)
            @dragStart = @context.transformedPoint(@lastX, @lastY)
        )
        canvas.mousemove((evt) =>
            return unless @viewSettings.panEnabled
            @lastX = evt.offsetX or (evt.pageX - canvas.offsetLeft)
            @lastY = evt.offsetY or (evt.pageY - canvas.offsetTop)
            if @dragStart
                pt = @context.transformedPoint(@lastX, @lastY)
                @context.translate pt.x - @dragStart.x, pt.y - @dragStart.y
                @viewer.paint()
        )
        canvas.mouseup((evt) =>
            @dragStart = null
        )
        canvas.on("DOMMouseScroll", @_handleScroll)
        canvas.on("mousewheel", @_handleScroll)


    _canvasClick: (e) =>
        pt = @context.transformedPoint(e.offsetX, e.offsetY)
        cx = pt.x / @width
        cy = pt.y / @height
        pt = @_snapToGrid(cx, cy)
        @viewer.updatePosition(@dim, pt.x, pt.y)


    _zoom: (clicks) =>
        return unless @viewSettings.zoomEnabled
        pt = @context.transformedPoint(@lastX, @lastY)
        @context.translate pt.x, pt.y
        factor = Math.pow(@scaleFactor, clicks)
        @context.scale factor, factor
        @context.translate -pt.x, -pt.y
        @viewer.paint()


    _handleScroll: (evt) =>
        oe = evt.originalEvent
        delta = (if oe.wheelDelta then (oe.wheelDelta / 40) else (if oe.detail then -oe.detail else 0))
        @_zoom delta  if delta
        evt.preventDefault() and false



class Crosshairs

    constructor: (@visible=true, @color='lime', @width=1) ->



class ColorMap

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
        'hot and cold': ['aqua', '#0099FF', 'blue', 'white', 'red', 'orange', 'yellow']
        'bright lights': ['blue', 'red', 'yellow', 'green', 'purple']
        terrain: ['#006400', 'green', 'lime', 'yellow', '#b8860b', '#cd853f', '#ffc0cb', 'white']
    })

    
    constructor: (@min, @max, palette = 'hot and cold', @steps = 40) ->
        @range = @max - @min
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

        

# A Slider class--wraps around jQuery-ui slider
class Slider

    constructor: (@container, @name, @element, @orientation, @min, @max, @value, @step) ->
        @range = if @name.match(/threshold/g) then 'max'
        else if @name.match(/nav/g) then false
        else 'min'
        @_jQueryInit()
        

    change: (e, ui) =>
        # For nav sliders, trigger coordinate update
        if @name.match(/nav/g)
            @container.navSlideChange(ui.value)
        else
            # For visual settings sliders, trigger general UI update
            @container.settingsChanged(e)
        e.stopPropagation()
            

    _jQueryInit: ->
        $(@element).slider(
            {
                orientation: @orientation
                range: @range
                min: @min
                max: @max
                step: @step
                slide: @change
                value: @value
            }
        )



class DataField

    constructor: (@panel, @name, @element) ->

