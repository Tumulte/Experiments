// Converted from: texturedhouse.obj
//  vertices: 26
//  faces: 24 
//  materials: 1
//
//  Generated with OBJ -> Three.js converter
//  http://github.com/alteredq/three.js/blob/master/utils/exporters/convert_obj_threejs_slim.py


var model = {
    'materials': [	{
	"DbgColor" : 0xeeeeee,
	"DbgIndex" : 0,
	"DbgName" : "Material.001_texturetest.jpg",
	"colorAmbient" : [0.0, 0.0, 0.0],
	"colorDiffuse" : [0.64000000000000001, 0.64000000000000001, 0.64000000000000001],
	"colorSpecular" : [0.5, 0.5, 0.5],
	"illumination" : 2,
	"mapDiffuse" : "texturetest.jpg",
	"opticalDensity" : 1.0,
	"specularCoef" : 96.078431,
	"transparency" : 1.0
	}],

    'buffers': 'texturedhouse.bin',

    'end': (new Date).getTime()
    }
    
postMessage( model );
