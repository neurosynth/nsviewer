# Neurosynth Viewer
NSViewer is a CoffeeScript/JS library for visualization of functional MRI data.

## Installation

To install, just drop the viewer.js file into your project and link to it. You'll also need to make sure the folllowing dependencies are available:

* jQuery and jQueryUI
* [Sylvester](http://sylvester.jcoglan.com)
* [RainbowVis-JS](https://github.com/anomal/RainbowVis-JS)
* [xtk](https://github.com/xtk/X) (only necessary if you want to load Nifti volumes directly)
* Bootstrap (not strictly necessary, but strongly recommended for glyphs)

Probably the easiest way to make sure you have everything you need is to add all of the files in the example/js/ folder to your project.

## Usage

The source code for the following example can be found in example/js/app.js. You can also play with a live demo of the example [here](http://pilab.psy.utexas.edu/demos/nsviewer/index.html). This quickstart just walks through the contents of the app.js file.

First, we initialize a new Viewer:

	viewer = new Viewer('#layer_list', '.layer_settings')

The arguments passed here identify the HTML containers we want to use to display the list of image layers and the active layer's settings, respectively.

Next, we create three views, for axial, sagittal, and coronal slices. The first argument indicates the HTML container to use; the second specifies the axis to slice along (axial, coronal, or sagittal).

	viewer.addView('#view_axial', Viewer.AXIAL);
	viewer.addView('#view_coronal', Viewer.CORONAL);
	viewer.addView('#view_sagittal', Viewer.SAGITTAL);

Now we add sliders for manipulating the active layer's opacity and positive and negative thresholds. These calls involve more arguments, most of which are passed to jQuery-UI to set up the sliders (e.g., arguments 4 through 7 in each of the calls below reflect the minimum value, maximum value, initial value, and size of incremental step, respectively). See the API documentation for details.

	viewer.addSlider('opacity', '.slider#opacity', 'horizontal', 0, 1, 1, 0.05);
	viewer.addSlider('pos-threshold', '.slider#pos-threshold', 'horizontal', 0, 1, 0, 0.01);
	viewer.addSlider('neg-threshold', '.slider#neg-threshold', 'horizontal', 0, 1, 0, 0.01);

We can also add navigation sliders that allow us to surf through a single plane by holding down and dragging a slider:

	viewer.addSlider("nav-xaxis", ".slider#nav-xaxis", "horizontal", 0, 1, 0.5, 0.01, Viewer.XAXIS);
	viewer.addSlider("nav-yaxis", ".slider#nav-yaxis", "vertical", 0, 1, 0.5, 0.01, Viewer.YAXIS);
	viewer.addSlider("nav-zaxis", ".slider#nav-zaxis", "vertical", 0, 1, 0.5, 0.01, Viewer.ZAXIS);

The calls here are similar to those above, except that because these sliders only apply to a single plane (i.e., we want sliders that manipulate the X, Y, and Z axes respectively), we need to tell the viewer that in the last argument.

So much for sliders. Now, let's think about other elements of the UI. Color palette selection would be nice, so let's add a drop-down select element for that:

	viewer.addColorSelect('#color_palette');

We'd also like to manipulate whether the user sees all values in an image, or only positive or negative values (e.g., only activations or only deactivations in a functional overlay):

	viewer.addSignSelect('#select_sign');

Oh, we probably also want to see some information about the current voxel as we navigate around the brain, so let's add a couple of text fields to show the current coordinates and current voxel value:

	viewer.addDataField('voxelValue', '#data_current_value')
	viewer.addDataField('currentCoords', '#data_current_coords')

Now that the viewer itself is all set up, let's make sure everything is nicely painted to the canvas:

	viewer.clear()

This step is completely optional, but it ensures that the user sees something sensible (i.e., empty black canvases) until we have something more meaningful to show.

Okay, at this point we're ready to finally load some images into the viewer. We can specify our images as an array of JSON objects, where each object contains the parameters for a single image to load. In this example, we load four different images. Here's the full specification:

	images = [
		{
			'url': 'data/MNI152.json',
			'name': 'MNI152 2mm',
			'colorPalette': 'grayscale',
			'cache': true
		},
		{
			'url': 'data/language_meta.json',
			'name': 'language meta-analysis',
			'colorPalette': 'blue'			
		},
		{
			'url': 'data/emotion_meta.nii.gz',
			'name': 'emotion meta-analysis',
			'colorPalette': 'green'
		},
		{	
			'name': 'spherical ROI',
			'colorPalette': 'yellow',
			'data': {
				'dims': [91, 109, 91],
				'peaks':
					{ 'peak1':
						{'x': -48, 'y': 20, 'z': 20, 'r': 6, 'value': 1 }
					}
			}
		}
	]

Notice that there are differences in how these images are specified. In the first two cases, we're loading the images from JSON files (the viewer will infer this from the .json extension). In the third case, we load the image directly from a Nifti image. And in the last case, we're actually dynamically generating our image by telling the viewer to create a blank image and then draw a sphere in left DLPFC.

Once we're done defining our images, we tell the viewer to load them:

	viewer.loadImages(images)

And that's it, we're all done!


## Developing

You'll need a javascript runtime (node.js should work great) and CoffesScript. Node should give you the `cake` build system. To compile all of src/*coffee into lib/viewer.js, run:

	cake build

To view the examples, the simplest way is probably to go into the examples directory, run:

	python -m SimpleHTTPServer 8888

and point your browser to http://localhost:8888.

For automated building and copying the updated viewer.js to your examples directory (recommended!), install the `guard` and `guard-shell` ruby gems, and run:

	guard
