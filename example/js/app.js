jQuery(document).ready(function() {

	viewer = Viewer.get('#layer_list', '.layer_settings')
	viewer.addView('#view_axial', 2);
	viewer.addView('#view_coronal', 1);
	viewer.addView('#view_sagittal', 0);
	viewer.addSlider('opacity', '.slider#opacity', 'horizontal', 'false', 0, 1, 1, 0.05);
	viewer.addSlider('pos-threshold', '.slider#pos-threshold', 'horizontal', 'false', 0, 1, 0, 0.01);
	viewer.addSlider('neg-threshold', '.slider#neg-threshold', 'horizontal', 'false', 0, 1, 0, 0.01);
	viewer.addColorSelect('#select_color');
	viewer.addSignSelect('#select_sign')
	viewer.addDataField('voxelValue', '#data_current_value')
	viewer.addDataField('currentCoords', '#data_current_coords')
	viewer.loadImageFromJSON('data/MNI152.json', 'MNI152 2mm', 'grayscale')
	viewer.loadImageFromJSON('data/language_meta.json', 'language meta-analysis', 'hot and cold', 'both')
	viewer.loadImageFromJSON('data/emotion_meta.json', 'emotion meta-analysis', 'bright lights', 'both')
	viewer.paint()

});