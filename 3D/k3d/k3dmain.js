/**
 * K3D demos
 * 
 * Copyright (C) Kevin Roast 2010
 * http://www.kevs3d.co.uk/dev
 * email: kevtoast at yahoo.com
 * twitter: @kevinroast
 * 
 * 26/11/09 First version
 * 
 * I place this code in the public domain - because it's not rocket science
 * and it won't make me any money, so do whatever you want with it, go crazy
 */

var KEY = { SHIFT:16, CTRL:17, ESC:27, RIGHT:39, UP:38, LEFT:37, DOWN:40, SPACE:32,
            A:65, E:69, L:76, P:80, R:82, Z:90 };

var bitmaps = [];

/**
 * Global window onload handler
 */
function onloadHandler()
{
   // get the images loading
   bitmaps.push(new Image());
   bitmaps.push(new Image());
   var loader = new Preloader();
   loader.addImage(bitmaps[0], 'images/texture4.png');
   loader.addImage(bitmaps[1], 'images/texture3.png');
   
   // the attactor scene is displayed first and responsible for allowing the
   // player to start the game once all images have been loaded
   loader.onLoadCallback(init);
}

function init()
{
   // canvas demo areas
   var canvas1 = document.getElementById('canvas1');

   
   var k3dmain1 = new K3D.Controller(canvas1);

   // my own try
      var obj = new K3D.K3DObject();

      with (obj)
      {
         drawmode = "wireframe";
         aboutx = 0; abouty = -0; aboutz = -4;
         scale = 100;
         init(
            [{x:0,y:0,z:0}, {x:1,y:1,z:-1}, {x:1,y:-1,z:-1}, {x:-1,y:-1,z:-1}, {x:-1,y:1,z:1}, {x:1,y:1,z:1}, {x:0,y:-0,z:1}, {x:-1,y:-1,z:0}],
            [{a:0,b:1}, {a:1,b:2}, {a:2,b:3}, {a:3,b:0}, {a:4,b:5}, {a:5,b:6}, {a:6,b:7}, {a:7,b:4}, {a:0,b:4}, {a:1,b:5}, {a:2,b:6}, {a:3,b:7}],
            [{color:[55,0,0],vertices:[0,1,2,3]},{color:[55,0,0],vertices:[0,4,5,1]},{color:[55,0,255],vertices:[1,5,6,2]},{color:[255,255,0],vertices:[2,6,7,3]},{color:[0,255,255],vertices:[3,7,4,0]},{color:[255,0,255],vertices:[7,6,5,4]}]
         );
      }
      k3dmain1.addK3DObject(obj);
   
   
   // bind document keyhandler to aid debugging
   document.onkeydown = function(event)
   {
      var keyCode = (event === null ? window.event.keyCode : event.keyCode);
      var obj = k3dmain1.objects[0];
      switch (keyCode)
      {
         case KEY.SPACE:
         {
            switch (obj.drawmode)
            {
               case "point":
                  obj.shademode = "depthcue";
                  obj.drawmode = "wireframe";
                  break;
               case "wireframe":
                  obj.shademode = "lightsource";
                  obj.drawmode = "solid";
                  break;
               case "solid":
                  obj.shademode = "depthcue";
                  obj.drawmode = "point";
                  break;
            }
            break;
         }
         case KEY.LEFT:
         {
        	 obj.addphi = -1;
         }
         break;
         case KEY.RIGHT:
         {
        	 obj.addphi = 1;
         }
         break;
         case KEY.UP:
         {
        	 obj.addtheta = -1;
         }
         break;
         case KEY.DOWN:
         {
        	 obj.addtheta = 1;
         }
         break;
      }
   };
   document.onkeyup = function(event){
	   obj.addphi = 0;
	   obj.addtheta = 0;
   }
}

//nifty drag/touch event capture code borrowed from Mr Doob http://mrdoob.com/
var targetRotationX = 0;
var targetRotationOnMouseDownX = 0;
var mouseX = 0;
var mouseXOnMouseDown = 0;
var targetRotationY = 0;
var targetRotationOnMouseDownY = 0;
var mouseY = 0;
var mouseYOnMouseDown = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;

document.addEventListener('mousedown', onDocumentMouseDown, false);
document.addEventListener('touchstart', onDocumentTouchStart, false);
document.addEventListener('touchmove', onDocumentTouchMove, false);

function onDocumentMouseDown( event ) {

	event.preventDefault();
	
	document.addEventListener('mousemove', onDocumentMouseMove, false);
	document.addEventListener('mouseup', onDocumentMouseUp, false);
	document.addEventListener('mouseout', onDocumentMouseOut, false);
	
	mouseXOnMouseDown = event.clientX - windowHalfX;
	targetRotationOnMouseDownX = targetRotationX;
	mouseYOnMouseDown = event.clientY - windowHalfY;
	targetRotationOnMouseDownY = targetRotationY;
}

function onDocumentMouseMove( event )
{

	mouseX = event.clientX - windowHalfX;
	targetRotationX = targetRotationOnMouseDownX + (mouseX - mouseXOnMouseDown) * 0.02;
	mouseY = event.clientY - windowHalfY;
	targetRotationY = targetRotationOnMouseDownY + (mouseY - mouseYOnMouseDown) * 0.02;
}

function onDocumentMouseUp( event )
{

	document.removeEventListener('mousemove', onDocumentMouseMove, false);
	document.removeEventListener('mouseup', onDocumentMouseUp, false);
	document.removeEventListener('mouseout', onDocumentMouseOut, false);
}

function onDocumentMouseOut( event )
{

	document.removeEventListener('mousemove', onDocumentMouseMove, false);
	document.removeEventListener('mouseup', onDocumentMouseUp, false);
	document.removeEventListener('mouseout', onDocumentMouseOut, false);
}

function onDocumentTouchStart( event )
{
	if (event.touches.length == 1)
	{
		event.preventDefault();

		mouseXOnMouseDown = event.touches[0].pageX - windowHalfX;
		targetRotationOnMouseDownX = targetRotationX;
		mouseYOnMouseDown = event.touches[0].pageY - windowHalfY;
		targetRotationOnMouseDownY = targetRotationY;
	}
}

function onDocumentTouchMove( event )
{
	if (event.touches.length == 1)
	{
		event.preventDefault();
		
		mouseX = event.touches[0].pageX - windowHalfX;
		targetRotationX = targetRotationOnMouseDownX + (mouseX - mouseXOnMouseDown) * 0.05;
		mouseY = event.touches[0].pageY - windowHalfY;
		targetRotationY = targetRotationOnMouseDownY + (mouseX - mouseYOnMouseDown) * 0.05;
	}
}
