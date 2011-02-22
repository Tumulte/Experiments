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
         //rotation y x z
         addgamma = 0; addtheta = 0; addphi = 0.2;
         aboutx = 0; abouty = -0; aboutz = -4;
         scale = 100;
         init(
            [{x:0,y:0,z:0}, {x:1,y:1,z:-1}, {x:1,y:-1,z:-1}, {x:-1,y:-1,z:-1}, {x:-1,y:1,z:1}, {x:1,y:1,z:1}, {x:0,y:-0,z:1}, {x:-1,y:-1,z:0}],
            [{a:0,b:1}, {a:1,b:2}, {a:2,b:3}, {a:3,b:0}, {a:4,b:5}, {a:5,b:6}, {a:6,b:7}, {a:7,b:4}, {a:0,b:4}, {a:1,b:5}, {a:2,b:6}, {a:3,b:7}],
            [{color:[55,0,0],vertices:[0,1,2,3]},{color:[55,0,0],vertices:[0,4,5,1]},{color:[55,0,255],vertices:[1,5,6,2]},{color:[255,255,0],vertices:[2,6,7,3]},{color:[0,255,255],vertices:[3,7,4,0]},{color:[255,0,255],vertices:[7,6,5,4]}]
         );
      }
      k3dmain1.addK3DObject(obj);
   
   
   // add lightsource for solid object demo
   var light = new K3D.LightSource({x:70,y:70,z:-70}, [0.0,0.75,1.0], 70.0);
   light.addgamma = 2.5;
   k3dmain5.addLightSource(light);
   light = new K3D.LightSource({x:-50,y:-50,z:-70}, [1.0,1.0,0.0], 70.0);
   light.addgamma = 1.5;
   k3dmain5.addLightSource(light);
   // add an object to represent the lightsource so it is visible in the scene
   var lightObj = new K3D.K3DObject();
   with (lightObj)
   {
      color = [0,192,255];
      drawmode = "point";
      shademode = "plain";
      addgamma = 2.5;
      linescale = 16.0;
      init([{x:70,y:70,z:-70}], [], []);
   }
   k3dmain5.addK3DObject(lightObj);
   lightObj = new K3D.K3DObject();
   with (lightObj)
   {
      color = [255,255,0];
      drawmode = "point";
      shademode = "plain";
      addgamma = 1.5;
      linescale = 16.0;
      init([{x:-50,y:-50,z:-70}], [], []);
   }
   k3dmain5.addK3DObject(lightObj);
   
   // render first frames
   k3dmain1.tick();
   // use motion blur background fill
   k3dmain2.fillStyle = "rgba(0,0,0, 0.50)";
   k3dmain2.tick();
   k3dmain3.tick();
   k3dmain4.fillStyle = "rgba(0,0,0, 0.50)";
   k3dmain4.tick();
   k3dmain5.tick();
   
   // start main demo
   k3dmain1.paused = false;
   k3dmain1.tick();
   
   
   // bind document keyhandler to aid debugging
   document.onkeydown = function(event)
   {
      var keyCode = (event === null ? window.event.keyCode : event.keyCode);
      
      switch (keyCode)
      {
         case KEY.SPACE:
         {
            var obj = k3dmain3.objects[0];
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
      }
   };
}
