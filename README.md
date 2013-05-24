# Neurosynth Viewer
NSViewer is a CoffeeScript/JS library for visualization of functional MRI data.

## Installation

To install, just drop the viewer.js file into your project and link to it. You'll also need to make sure the folllowing dependencies are available:

* jQuery and jQueryUI
* [Sylvester](http://sylvester.jcoglan.com)
* [RainbowVis-JS](https://github.com/anomal/RainbowVis-JS)
* Bootstrap (not strictly necessary, but useful for displaying some components)

Probably the easiest way to make sure you have everything you need is to add all of the files in the example/js/ folder to your project.

## Usage

The source code for the following example can be found in example/js/app.js. You can also play with a live demo of the example [here](http://pilab.colorado.edu/demos/nsviewer/index.html). This quickstart just walks through the contents of the app.js file.

First, we initialize a new Viewer:

	viewer = Viewer.get('#layer_list', '.layer_settings')

The arguments passed here identify the HTML containers we want to use to display the list of image layers and the active layer's settings, respectively.

Next, we create three views, for axial, sagittal, and coronal slices. The first argument indicates the HTML container to use; the second specifies the axis to slice along(0 = axial, etc.).

	viewer.addView('#view_axial', 2);
	viewer.addView('#view_coronal', 1);
	viewer.addView('#view_sagittal', 0);

Now we add sliders for manipulating the active layer's opacity and positive and negative thresholds. These calls involve more arguments, most of which are passed to jQuery-UI to set up the sliders (see the source code for details).

	viewer.addSlider('opacity', '.slider#opacity', 'horizontal', 'false', 0, 1, 1, 0.05);
	viewer.addSlider('pos-threshold', '.slider#pos-threshold', 'horizontal', 'false', 0, 1, 0, 0.01);
	viewer.addSlider('neg-threshold', '.slider#neg-threshold', 'horizontal', 'false', 0, 1, 0, 0.01);

Color palette selection would be nice, so let's add a drop-down select element for that:

	viewer.addColorSelect('#color_palette');

Oh, we probably also want to see some information about the current voxel as we navigate around the brain, so let's add a couple of text fields to show the current coordinates and current voxel value:

	viewer.addDataField('voxelValue', '#data_current_value')
	viewer.addDataField('currentCoords', '#data_current_coords')

Now that the viewer itself is all set up, we can load a few images from JSON:

	viewer.loadImageFromJSON('data/MNI152.json', 'MNI152 2mm', 'gray')
	viewer.loadImageFromJSON('data/emotion_meta.json', 'emotion meta-analysis', 'bright lights')
	viewer.loadImageFromJSON('data/language_meta.json', 'language meta-analysis', 'hot and cold')

Here we're loading an MNI152 anatomical template, and then overlaying it with emotion and language meta-analyses from neurosynth.

And that's it, we're all done! All we have left to do is paint the whole thing to the canvas:

	viewer.paint()

## Developing

You'll need a javascript runtime (node.js should work great) and CoffesScript. Node should give you the 'cake' build system. To compile all of src/*coffee into lib/viewer.js, run:

	cake build