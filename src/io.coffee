# # Nifti image reader. Borrows heavily from xtk toolkit
# # and Satrajit Ghosh's parserNii--but dumps all the xtk rendering
# # dependencies that require a browser with WebGL.

# class NiftiParser

#   constructor: (url) ->

#     # Need to get file with XHR... assume we have file here
#     file = process(url)

#     # Initialize the image header  
#     parser new jParser(file, {
#       header: {

#         # Read header fields
#         sizeof_hdr: 'uint32'
#         data_type: ['string', 10]
#         db_name: ['string', 18]
#         extents: 'uint32'
#         session_error: 'uint16'
#         regular: ['string', 1]
#         dim_info: ['string', 1]
        
#         # image_dimension substruct
#         dim: ['array', 'uint16', 8)
#         intent_p1: 'float32'
#         intent_p2: 'float32'
#         intent_p3: 'float32'
#         intent_code: 'uint16'
#         datatype: 'uint16'
#         bitpix: 'uint16'
#         slice_start: 'uint16'
#         pixdim: ['array','float32', 8]
#         vox_offset: 'float32'
#         scl_slope: 'float32'
#         scl_inter: 'float32'
#         slice_end: 'uint16'
#         slice_code: ['string', 1]
#         xyzt_units: ['string', 1]
#         cal_max: 'float32'
#         cal_min: 'float32'
#         slice_duration: 'float32'
#         toffset: 'float32'
#         glmax: 'uint32'
#         glmin: 'uint32'
        
#         # data_history substruct
#         descrip: ['string', 80]
#         aux_file: ['string', 24]
#         qform_code: 'uint16'
#         sform_code: 'uint16'
#         quatern_b: 'float32'
#         quatern_c: 'float32'
#         quatern_d: 'float32'
#         qoffset_x: 'float32'
#         qoffset_y: 'float32'
#         qoffset_z: 'float32'
#         srow_x: ['array', 'float32', 4]
#         srow_y: ['array', 'float32', 4]
#         srow_z: ['array', 'float32', 4]
#         intent_name: ['string', 16]
#         magic: ['string', 4]
#       }

#       data: ->
        
    
#     # jump to vox_offset which is very important since the
#     # header can be shorter as the usual 348 bytes
#     @jumpTo parseInt(vox_offset, 10)
    
#     # number of pixels in the volume
#     volsize = dim[1] * dim[2] * dim[3]
    
#     # scan the pixels regarding the data type
#     switch datatype
#       when 2
        
#         # unsigned char
#         data: "uchar", volsize)
#       when 4
        
#         # signed short
#         data: "sshort", volsize)
#       when 8
        
#         # signed int
#         data: "sint", volsize)
#       when 16
        
#         # float
#         data: "float", volsize)
#       when 32
        
#         # complex
#         data: "complex", volsize)
#       when 64
        
#         # double
#         data: "double", volsize)
#       when 256
        
#         # signed char
#         data: "schar", volsize)
#       when 512
        
#         # unsigned short
#         data: "ushort", volsize)
#       when 768
        
#         # unsigned int
#         data: "uint", volsize)
#       else
#         throw new Error("Unsupported NII data type: " + datatype)
    
#     # get the min and max intensities
#     min_max = @arrayMinMax(data)
#     min = min_max[0]
#     max = min_max[1]
#     MRI


#     # Wrapper around jDataView
#     # scan: (dtype, chunks=1) ->


