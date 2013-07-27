# Various transformations between different coordinate frames.
# Note that right now the atlas-related transformations are
# hardcoded for MNI 2x2x2 space; need to generalize this!
Transform =

  # Takes compressed JSON-encoded image data as input and reconstructs
  # into a dense 1D vector, indexed from 0 to the total number of voxels.
  jsonToVector: (data) ->
    v = new Array(data.dims[0] * data.dims[1] * data.dims[2])
    v[i] = 0 for i in [0...v.length]
    for i in [0...data.values.length]
      curr_inds = data.indices[i]
      for j in [0...curr_inds.length]
          v[curr_inds[j] - 1] = data.values[i]
    return(v)

  # Reshape a 1D vector of all voxels into a 3D volume with specified dims.
  vectorToVolume: (vec, dims) ->
    vol = []
    for i in [0...dims[0]]
      vol[i] = []
      for j in [0...dims[1]]
        vol[i][j] = []
        for k in [0...dims[2]]
          vol[i][j][k] = 0
          sliceSize = dims[1] * dims[2]
    for i in [0...vec.length]
      continue if typeof vec[i] is `undefined`
      x = Math.floor(i / sliceSize)
      y = Math.floor((i - (x * sliceSize)) / dims[2])
      z = i - (x * sliceSize) - (y * dims[2])
      vol[x][y][z] = vec[i]
    return(vol)

  # Generic coordinate transformation function that takes an input
  # set of coordinates and a matrix to use in the transformation.
  # Depends on the Sylvester library.
  transformCoordinates: (coords, matrix, round = true) ->
    m = $M(matrix)
    coords = coords.slice(0)  # Don't modify in-place
    coords.push(1)
    v = $V(coords)
    res = []
    m.x(v).each (e) ->
      e = Math.round(e) if round
      res.push(e)
    return res

  # Transformation matrix for viewer space --> atlas (MNI 2mm) space
  viewerToAtlas: (coords) ->
    matrix = [[180, 0, 0, -90], [0, -218, 0, 90], [0, 0, -180, 108]]
    return @transformCoordinates(coords, matrix)

  atlasToViewer: (coords) ->
    matrix = [[1.0/180, 0, 0, 0.5], [0, -1.0/218, 0, 90.0/218], [0, 0, -1.0/180, 108.0/180]]
    return @transformCoordinates(coords, matrix, false)

  # Transformation matrix for atlas (MNI 2mm) space --> image (0-indexed) space
  atlasToImage: (coords) ->
    matrix = [[-0.5, 0, 0, 45], [0, 0.5, 0, 63], [0, 0, 0.5, 36]]
    return @transformCoordinates(coords, matrix)

  # Transformation matrix for image space --> atlas (MNI 2mm) space
  imageToAtlas: (coords) ->
    matrix = [[-2, 0, 0, 90], [0, 2, 0, -126], [0, 0, 2, -72]]
    return @transformCoordinates(coords, matrix)