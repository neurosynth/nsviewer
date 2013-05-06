
# # # provides
# # goog.provide "X.parserNII"

# # # requires
# # goog.require "X.event"
# # goog.require "X.object"
# # goog.require "X.parser"
# # goog.require "X.triplets"
# # goog.require "goog.math.Vec3"
# # goog.require "Zlib.Gunzip"

# # ###
# # Create a parser for .nii/.nii.gz files.

# # @constructor
# # @extends X.parser
# # ###
# # X.parserNII = ->
  
# #   #
# #   # call the standard constructor of X.parser
# #   goog.base this
  
# #   #
# #   # class attributes
  
# #   ###
# #   @inheritDoc
# #   @const
# #   ###
# #   @_classname = "parserNII"


# # # inherit from X.parser
# # goog.inherits X.parserNII, X.parser

# # ###
# # @inheritDoc
# # ###
# parseNII = (container, object, data, flag) ->

#   _data = data
  
#   # check if this data is compressed, then this int != 348
#   _compressionCheck = -1
#   if typeof DataView is "undefined"
#     _compressionCheck = new Int32Array(data, 0, 1)[0]
#   else
#     dataview = new DataView(data, 0)
#     _compressionCheck = dataview.getInt32(0, true)
#   unless _compressionCheck is 348
    
#     # we need to decompress the datastream
    
#     # here we start the unzipping and get a typed Uint8Array back
#     inflate = new Zlib.Gunzip(new Uint8Array(_data))
#     _data = inflate.decompress()
    
#     # .. and use the underlying array buffer
#     _data = _data.buffer
  
#   # parse the byte stream
#   MRI = @parseStream(_data)
  
#   # grab the dimensions
#   _dimensions = [MRI.dim[1], MRI.dim[2], MRI.dim[3]]
#   object._dimensions = _dimensions
  
#   # grab the spacing
#   _spacing = [MRI.pixdim[1], MRI.pixdim[2], MRI.pixdim[3]]
#   object._spacing = _spacing
  
#   # grab the min, max intensities
#   min = MRI.min
#   max = MRI.max
  
#   # attach the scalar range to the volume
#   object._min = object._windowLow = min
#   object._max = object._windowHigh = max
  
#   # .. and set the default threshold
#   # only if the threshold was not already set
#   object._lowerThreshold = min  if object._lowerThreshold is -Infinity
#   object._upperThreshold = max  if object._upperThreshold is Infinity
  
#   # create the object
#   object.create_()
#   X.TIMERSTOP @_classname + ".parse"
  
#   # re-slice the data according each direction
#   object._image = @reslice(object, MRI)
  
#   # the object should be set up here, so let's fire a modified event
#   modifiedEvent = new X.event.ModifiedEvent()
#   modifiedEvent._object = object
#   modifiedEvent._container = container
#   @dispatchEvent modifiedEvent


# ###
# Parse the data stream according to the .nii/.nii.gz file format and return an
# MRI structure which holds all parsed information.

# @param {!ArrayBuffer} data The data stream.
# @return {Object} The MRI structure which holds all parsed information.
# ###
# X.parserNII::parseStream = (data) ->
  
#   # attach the given data
#   @_data = data
  
#   #
#   # the header fields + 1 field for data
#   MRI =
#     sizeof_hdr: 0
#     data_type: null # !< ++UNUSED++ 
# # char data_type[10];
#     db_name: null # !< ++UNUSED++ 
# # char db_name[18];
#     extents: 0 # !< ++UNUSED++ 
# # int extents;
#     session_error: 0 # !< ++UNUSED++ 
# # short session_error;
#     regular: 0 # !< ++UNUSED++ 
# # char regular;
#     dim_info: null # !< MRI slice ordering. 
# # char hkey_un0;
#     dim: null # *!< Data array dimensions.*/ /* short dim[8]; */
#     intent_p1: 0 # *!< 1st intent parameter. */ /* short unused8; */
#     intent_p2: 0 # *!< 2nd intent parameter. */ /* short unused10; */
#     intent_p3: 0 # *!< 3rd intent parameter. */ /* short unused12; */
#     intent_code: 0 # *!< NIFTI_INTENT_* code. */ /* short unused14; */
#     datatype: 0 # *!< Defines data type! */ /* short datatype; */
#     bitpix: 0 # *!< Number bits/voxel. */ /* short bitpix; */
#     slice_start: 0 # *!< First slice index. */ /* short dim_un0; */
#     pixdim: null # *!< Grid spacings. */ /* float pixdim[8]; */
#     vox_offset: 0 # *!< Offset into .nii file */ /* float vox_offset; */
#     scl_slope: 0 # *!< Data scaling: slope. */ /* float funused1; */
#     scl_inter: 0 # *!< Data scaling: offset. */ /* float funused2; */
#     slice_end: 0 # *!< Last slice index. */ /* float funused3; */
#     slice_code: null # *!< Slice timing order. */
#     xyzt_units: null # *!< Units of pixdim[1..4] */
#     cal_max: 0 # *!< Max display intensity */ /* float cal_max; */
#     cal_min: 0 # *!< Min display intensity */ /* float cal_min; */
#     slice_duration: 0 # *!< Time for 1 slice. */ /* float compressed; */
#     toffset: 0 # *!< Time axis shift. */ /* float verified; */
#     glmax: 0 # !< ++UNUSED++ 
# # int glmax;
#     glmin: 0 # !< ++UNUSED++ 
# # int glmin;
#     descrip: null # *!< any text you like. */ /* char descrip[80]; */
#     aux_file: null # *!< auxiliary filename. */ /* char aux_file[24]; */
#     qform_code: 0 # *!< NIFTI_XFORM_* code. */ /*-- all ANALYZE 7.5 ---*/
#     sform_code: 0 # *!< NIFTI_XFORM_* code. */ /* fields below here */
#     quatern_b: 0 # *!< Quaternion b param. */
#     quatern_c: 0 # *!< Quaternion c param. */
#     quatern_d: 0 # *!< Quaternion d param. */
#     qoffset_x: 0 # *!< Quaternion x shift. */
#     qoffset_y: 0 # *!< Quaternion y shift. */
#     qoffset_z: 0 # *!< Quaternion z shift. */
#     srow_x: null # *!< 1st row affine transform. */
#     srow_y: null # *!< 2nd row affine transform. */
#     srow_z: null # *!< 3rd row affine transform. */
#     intent_name: null # *!< 'name' or meaning of data. */
#     magic: null # *!< MUST be "ni1\0" or "n+1\0". */
#     data: null
#     min: Infinity
#     max: -Infinity

  
#   # header_key substruct
#   MRI.sizeof_hdr = @scan("uint")
#   MRI.data_type = @scan("uchar", 10)
#   MRI.db_name = @scan("uchar", 18)
#   MRI.extents = @scan("uint")
#   MRI.session_error = @scan("ushort")
#   MRI.regular = @scan("uchar")
#   MRI.dim_info = @scan("uchar")
  
#   # image_dimension substruct
#   MRI.dim = @scan("ushort", 8)
#   MRI.intent_p1 = @scan("float")
#   MRI.intent_p2 = @scan("float")
#   MRI.intent_p3 = @scan("float")
#   MRI.intent_code = @scan("ushort")
#   MRI.datatype = @scan("ushort")
#   MRI.bitpix = @scan("ushort")
#   MRI.slice_start = @scan("ushort")
#   MRI.pixdim = @scan("float", 8)
#   MRI.vox_offset = @scan("float")
#   MRI.scl_slope = @scan("float")
#   MRI.scl_inter = @scan("float")
#   MRI.slice_end = @scan("ushort")
#   MRI.slice_code = @scan("uchar")
#   MRI.xyzt_units = @scan("uchar")
#   MRI.cal_max = @scan("float")
#   MRI.cal_min = @scan("float")
#   MRI.slice_duration = @scan("float")
#   MRI.toffset = @scan("float")
#   MRI.glmax = @scan("uint", 1)
#   MRI.glmin = @scan("uint", 1)
  
#   # data_history substruct
#   MRI.descrip = @scan("uchar", 80)
#   MRI.aux_file = @scan("uchar", 24)
#   MRI.qform_code = @scan("ushort")
#   MRI.sform_code = @scan("ushort")
#   MRI.quatern_b = @scan("float")
#   MRI.quatern_c = @scan("float")
#   MRI.quatern_d = @scan("float")
#   MRI.qoffset_x = @scan("float")
#   MRI.qoffset_y = @scan("float")
#   MRI.qoffset_z = @scan("float")
#   MRI.srow_x = @scan("float", 4)
#   MRI.srow_y = @scan("float", 4)
#   MRI.srow_z = @scan("float", 4)
#   MRI.intent_name = @scan("uchar", 16)
#   MRI.magic = @scan("uchar", 4)
  
#   # jump to vox_offset which is very important since the
#   # header can be shorter as the usual 348 bytes
#   @jumpTo parseInt(MRI.vox_offset, 10)
  
#   # number of pixels in the volume
#   volsize = MRI.dim[1] * MRI.dim[2] * MRI.dim[3]
  
#   # scan the pixels regarding the data type
#   switch MRI.datatype
#     when 2
      
#       # unsigned char
#       MRI.data = @scan("uchar", volsize)
#     when 4
      
#       # signed short
#       MRI.data = @scan("sshort", volsize)
#     when 8
      
#       # signed int
#       MRI.data = @scan("sint", volsize)
#     when 16
      
#       # float
#       MRI.data = @scan("float", volsize)
#     when 256
      
#       # signed char
#       MRI.data = @scan("schar", volsize)
#     when 512
      
#       # unsigned short
#       MRI.data = @scan("ushort", volsize)
#     when 768
      
#       # unsigned int
#       MRI.data = @scan("uint", volsize)
#     else
#       throw new Error("Unsupported NII data type: " + MRI.datatype)
  
#   # get the min and max intensities
#   min_max = @arrayMinMax(MRI.data)
#   MRI.min = min_max[0]
#   MRI.max = min_max[1]
#   MRI


# # export symbols (required for advanced compilation)
# goog.exportSymbol "X.parserNII", X.parserNII
# goog.exportSymbol "X.parserNII.prototype.parse", X.parserNII::parse