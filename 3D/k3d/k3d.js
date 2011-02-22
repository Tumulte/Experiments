/**
 * Canvas K3D library.
 * 
 * Software rendering of 3D objects using the 2D canvas context.
 * 
 * Copyright (C) Kevin Roast 2010
 * http://www.kevs3d.co.uk/dev
 * email: kevtoast at yahoo.com
 * twitter: @kevinroast
 * 
 * 26/11/09 First version
 * 26/05/10 Added code to maintain framerate
 * 01/06/10 Updated with additional features for UltraLight demo
 * 09/06/10 Implemented texture mapping for polygons
 * 
 * I place this code in the public domain - because it's not rocket science
 * and it won't make me any money, so do whatever you want with it, go crazy.
 */


var DEBUG = false;


/**
 * K3D root namespace.
 *
 * @namespace K3D
 */
if (typeof K3D == "undefined" || !K3D)
{
   var K3D = {};
}


/**
 * K3D depthcue colour lookup table.
 */
K3D.DEPTHCUE = new Array(256);
for (var c=0; c<256; c++)
{
   K3D.DEPTHCUE[c] = "rgb(" + c + "," + c + "," + c + ")";
}


/**
 * K3D.Controller class.
 * 
 * Controller for a number of K3D objects. Maintains and sorts the object list. Provides the
 * tick() function for rendering and processes each object during the render loop. Also
 * manages the canvas render context.
 */
(function()
{
   /**
    * K3D.Controller constructor
    * 
    * @param canvas {Object}  The canvas to render the object list into.
    */
   K3D.Controller = function(canvas, nopause)
   {
      this.canvas = canvas;
      // bind click event to toggle rendering loop on/off
      var me = this;
      if (!nopause)
      {
         canvas.onclick = function(event)
         {
            me.paused = !me.paused;
            if (!me.paused)
            {
               me.tick();
            }
         };
      }
      
      this.objects = [];
      this.lights = [];
      this.renderers = [];
      this.renderers["point"] = new K3D.PointRenderer();
      this.renderers["wireframe"] = new K3D.WireframeRenderer();
      this.renderers["solid"] = new K3D.SolidRenderer();
   };
   
   K3D.Controller.prototype =
   {
      canvas: null,
      fillStyle: null,
      interval: null,
      renderers: null,
      objects: null,
      lights: null,
      paused: true,
      lastFrame: 0,
      callback: null,
      fps: 40,
      
      /**
       * Add a K3D object to the list of objects for rendering
       */
      addK3DObject: function(obj)
      {
         obj.setController(this, this.canvas.width, this.canvas.height);
         this.objects.push(obj);
      },
      
      /**
       * Add a light source to the list of available lights
       */
      addLightSource: function(light)
      {
         this.lights.push(light);
      },
      
      /**
       * @param drawmode {string} drawing mode constant
       * @return the renderer for the given drawing mode
       */
      getRenderer: function(drawmode)
      {
         return this.renderers[drawmode];
      },
      
      /**
       * Render tick - should be called via a setInterval() function
       */
      tick: function()
      {
         var frameStart = new Date().getTime();
         
         if (this.callback)
         {
            this.callback.call(this);
         }
         
         var ctx = this.canvas.getContext('2d');
         
         // TODO: store object render boundries - implement rectangle culled clearing between frames
         if (this.fillStyle !== null)
         {
            ctx.fillStyle = this.fillStyle;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
         }
         else
         {
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
         }
         
         // execute transformation pipeline for each object and light
         var objects = this.objects;
         for (var i = 0, len = objects.length; i < len; i++)
         {
            objects[i].executePipeline();
         }
         var lights = this.lights;
         for (var i = 0, len = lights.length; i < len; i++)
         {
            lights[i].executePipeline();
         }
         
         // sort objects in average Z order
         objects.forEach(function clearAverageZ(el, i, a)
         {
            el.averagez = null;
         });
         objects.sort(function sortObjects(a, b)
         {
            // ensure we have an average z coord for the objects to test
            if (a.averagez === null)
            {
               a.calculateAverageZ();
            }
            if (b.averagez === null)
            {
               b.calculateAverageZ();
            }
            return (a.averagez < b.averagez ? 1 : -1);
         });
         
         // render objects to the canvas context
         for (var i = 0, len = objects.length; i < len; i++)
         {
            ctx.save();
            objects[i].executeRenderer(ctx);
            ctx.restore();
         }
         
         // calculate interval required for smooth animation
         var delay = 1000/this.fps;
         var frameTime = (new Date().getTime() - frameStart);
         if (!this.paused)
         {
            var me = this;
            setTimeout(function(){me.tick()}, delay - frameTime <= 0 ? 1 : delay - frameTime);
         }
         if (DEBUG && DEBUG.FPS)
         {
            ctx.fillStyle = "white";
            ctx.fillText(frameTime, 4, 12);
         }
      }
   };
})();


/**
 * K3D.BaseObject class
 * 
 * Abstract base class functionality for all K3D objects.
 */
(function()
{
   /**
    * K3D.BaseObject Constructor
    */
   K3D.BaseObject = function()
   {
      // init a 3x3 multidimensonal matrix array
      this.matrix = new Array(3);
      for (var i=0; i<3; i++)
      {
         this.matrix[i] = new Array(3);
      }
      this.angles = new Array(6);
      
      return this;
   };
   
   /**
    * K3D.BaseObject prototype
    */
   K3D.BaseObject.prototype =
   {
      matrix: null,
      angles: null,
      offx: 0, offy: 0, offz: 0,
      aboutx: 0, abouty: 0, aboutz: 0,
      ogamma: 0, otheta: 0, ophi: 0,
      addgamma: 0, addtheta: 0, addphi: 0,
      velx: 0, vely: 0, velz: 0,
      bminx: 0, bminy: 0, bminz: 0, bmaxx: 0, bmaxy: 0, bmaxz: 0,
      doublesided: false,
      
      /**
       * Populate the combined XYZ rotation matrix given the current angular rotation
       * 
       * @method calcMatrix
       */
      calcMatrix: function()
      {
         var angles = this.angles, matrix = this.matrix;
         
         // using standard combined XYZ rotation matrix
         angles[0] = Math.sin(this.ogamma * RAD);
         angles[1] = Math.cos(this.ogamma * RAD);
         angles[2] = Math.sin(this.otheta * RAD);
         angles[3] = Math.cos(this.otheta * RAD);
         angles[4] = Math.sin(this.ophi * RAD);
         angles[5] = Math.cos(this.ophi * RAD);
         
         matrix[0][0] = angles[5] * angles[1];
         matrix[1][0] = -(angles[5] * angles[0]);
         matrix[2][0] = angles[4];
         matrix[0][1] = (angles[2] * angles[4] * angles[1]) + (angles[3] * angles[0]);
         matrix[1][1] = (angles[3] * angles[1]) - (angles[2] * angles[4] * angles[0]);
         matrix[2][1] = -(angles[2] * angles[5]);
         matrix[0][2] = (angles[2] * angles[0]) - (angles[3] * angles[4] * angles[1]);
         matrix[1][2] = (angles[2] * angles[1]) + (angles[3] * angles[4] * angles[0]);
         matrix[2][2] = angles[3] * angles[5];
      },
      
      /**
       * Transform object coords to world coords based on current offsets and rotation matrix.
       * 
       * @method transformToWorld
       */
      transformToWorld: function()
      {
      },
      
      /**
       * Routine to calculate and perform all transformations including sorting of object
       * ready for rendering a frame render.
       * 
       * @method executePipeline
       */
      executePipeline: function()
      {
         // inc angles
         this.ogamma += this.addgamma;
         this.otheta += this.addtheta;
         this.ophi   += this.addphi;
         
         // add velocities
         this.offx += this.velx;
         this.offy += this.vely;
         this.offz += this.velz;
         
         // check for bounce box edges, reverse velocities if needed
         if (this.offx < this.bminx || this.offx > this.bmaxx) this.velx *= -1;
         if (this.offy < this.bminy || this.offy > this.bmaxy) this.vely *= -1;
         if (this.offz < this.bminz || this.offz > this.bmaxz) this.velz *= -1;
         
         // call the transformation routines
         this.calcMatrix();
         this.transformToWorld();
      }
   };
})();


/**
 * K3D.K3DObject class
 * 
 * Common functionality for K3D renderable objects.
 */
(function()
{
   /**
    * K3D.K3DObject Constructor
    */
   K3D.K3DObject = function()
   {
      K3D.K3DObject.superclass.constructor.call(this);
      this.textures = [];
      
      return this;
   };
   
   /**
    * K3D.K3DObject prototype
    */
   extend(K3D.K3DObject, K3D.BaseObject,
   {
      controller: null,
      worldcoords: null,
      screenx: 0,
      screeny: 0,
      linescale: 2.0,
      color: null,
      drawmode: "point",      // one of "point", "wireframe", "solid"
      shademode: "depthcue",  // one of "plain", "depthcue", "lightsource"
      perslevel: 512,
      scale: 0,
      points: null,
      edges: null,
      faces: null,
      screencoords: null,
      averagez: null,
      textures: null,
      
      /**
       * Object initialisation. Accepts the points, edges and faces for an object.
       * All values are passed as continuous single arrays - no sub-objects.
       * Other properties for the object, such as 'scale' should be set before this
       * method is called. It should only be called once unless the object is reused.
       * 
       * @method init
       * @param points {Array}   {x,y,z} coordinate values as an continuous single array
       * @param edges {Array}    {a,b} edge index values into the coordinate array
       * @param faces {Array}    {vertices:[p1...pN],color:[r,g,b],texture:n}
       *                         vertices - array of index values into the coordinate array
       *                         color - the RGB colour triple (optional - white is default)
       *                         texture - index into the texture list for the object (optional)
       */
      init: function(points, edges, faces)
      {
         this.points = points;
         this.edges = edges;
         this.faces = faces;
         
         // init the world and screen coordinate object arrays
         // they are reused each frame - saving object creation time
         this.worldcoords = new Array(points.length + faces.length);
         for (var i=0, j=this.worldcoords.length; i<j; i++)
         {
            this.worldcoords[i] = {x:0, y:0, z:0};
         }
         this.screencoords = new Array(points.length);
         for (var i=0, j=this.screencoords.length; i<j; i++)
         {
            this.screencoords[i] = {x:0, y:0};
         }
         
         // scale the object if required
         if (this.scale !== 0)
         {
            for (var i=0, j=this.points.length; i<j; i++)
            {
               points[i].x *= this.scale;
               points[i].y *= this.scale;
               points[i].z *= this.scale;
            }
         }
         
         // calculate normal vectors for face data - and set default colour
         // value if not supplied in the data set
         for (var i=0, j=faces.length; i<j; i++)
         {
            // First calculate normals from 3 points on the poly:
            // Vector 1 = Vertex B - Vertex A
            // Vector 2 = Vertex C - Vertex A
            var vertices = faces[i].vertices;
            var x1 = points[vertices[1]].x - points[vertices[0]].x;
            var y1 = points[vertices[1]].y - points[vertices[0]].y;
            var z1 = points[vertices[1]].z - points[vertices[0]].z;
            var x2 = points[vertices[2]].x - points[vertices[0]].x;
            var y2 = points[vertices[2]].y - points[vertices[0]].y;
            var z2 = points[vertices[2]].z - points[vertices[0]].z;
            // save the normal vector as part of the face data structure
            faces[i].normal = calcNormalVector(x1, y1, z1, x2, y2, z2);
            
            // Apply default face colour if none set
            if (!faces[i].color)
            {
               faces[i].color = [255,255,255];
            }
            if (faces[i].texture === undefined)
            {
               faces[i].texture = null;
            }
         }
         
         // set default object colour if plain rendering mode
         if (this.color === null)
         {
            this.color = [255,255,255];
         }
      },
      
      /**
       * @param controller {K3D.Controller} parent controller
       * @param screenWidth {Number} Width of the screen canvas area
       * @param screenHeight {Number} Height of the screen canvas area
       */
      setController: function(controller, screenWidth, screenHeight)
      {
         this.controller = controller;
         
         // screen centre point
         this.screenx = screenWidth/2;
         this.screeny = screenHeight/2;
         
         // init object bounding box and variables to defaults
         this.bminx = -this.screenx;
         this.bminy = -this.screeny;
         this.bminz = -this.screenx;
         this.bmaxx = this.screenx;
         this.bmaxy = this.screeny;
         this.bmaxz = this.screenx;
      },
      
      /**
       * Transform object coords to world coords based on current offsets and rotation matrix.
       * 
       * @method transformToWorld
       */
      transformToWorld: function()
      {
         var x, y, z;
         var points = this.points, worldcoords = this.worldcoords,
             faces = this.faces, matrix = this.matrix;
         var ax = this.aboutx, ay = this.abouty, az = this.aboutz,
             offx = this.offx, offy = this.offy, offz = this.offz;
         
         // matrix rows
         var matrix0 = matrix[0],
             matrix1 = matrix[1],
             matrix2 = matrix[2];
         
         // transform object vertices
         for (var i=0, len=points.length; i<len; i++)
         {
            x = points[i].x + ax;                 // add origin offsets, allowing an object to
            y = points[i].y + ay;                 // move the local origin to any point in 3D space
            z = points[i].z + az;
            
            // perform matrix multiplication and add the offsets which allow an object
            // to rotate at a distance from the local origin
            
            worldcoords[i].x =
               (matrix0[0]*x) + (matrix0[1]*y) + (matrix0[2]*z) + offx;
            worldcoords[i].y =
               (matrix1[0]*x) + (matrix1[1]*y) + (matrix1[2]*z) + offy;
            worldcoords[i].z =
               (matrix2[0]*x) + (matrix2[1]*y) + (matrix2[2]*z) + offz;
         }
         
         // transform normal vectors - set as the "worldnormal" Vector3D property on the face object
         for (var i=0, len=faces.length, normal; i<len; i++)
         {
            normal = faces[i].normal;
            x = normal.x;
            y = normal.y;
            z = normal.z;
            
            faces[i].worldnormal = new Vector3D(
               (matrix0[0]*x) + (matrix0[1]*y) + (matrix0[2]*z) + offx,
               (matrix1[0]*x) + (matrix1[1]*y) + (matrix1[2]*z) + offy,
               (matrix2[0]*x) + (matrix2[1]*y) + (matrix2[2]*z) + offz);
         }
      },
      
      /**
       * Perspective calculation to transform 3D world coords to 2D screen coords.
       * 
       * @method transformToScreen
       */
      transformToScreen: function()
      {
         var x, y, z;
         var worldcoords = this.worldcoords, screencoords = this.screencoords;
         var screenx = this.screenx, screeny = this.screeny, perslevel = this.perslevel;
         
         // perform simple perspective transformation
         for (var i=0, len=this.points.length; i<len; i++)
         {
            x = worldcoords[i].x;
            y = worldcoords[i].y;
            z = worldcoords[i].z + perslevel;
            
            // stop divide by zero
            if (z === 0) z = 1;
            
            screencoords[i].x = ((x * perslevel) / z) + screenx;
            screencoords[i].y = screeny - ((y * perslevel) / z);
         }
      },
      
      /**
       * Routine to calculate and perform all transformations including sorting of object
       * ready for rendering a frame render.
       * 
       * @method executePipeline
       */
      executePipeline: function()
      {
         // call superclass transformation and projection routines
         K3D.K3DObject.superclass.executePipeline.call(this);
         this.transformToScreen();
         
         // sort object by distance using the appropriate renderer
         this.controller.getRenderer(this.drawmode).sortByDistance(this);
      },
      
      /**
       * Routine to execute the renderer for this object.
       * 
       * @param ctx {Object} Canvas context
       * @method executeRenderer
       */
      executeRenderer: function(ctx)
      {
         this.controller.getRenderer(this.drawmode).renderObject(this, ctx);
      },
      
      /**
       * Calculate the average Z coord for the object within the world space.
       * This value is used by the parent controller to sort the list of objects for rendering.
       * 
       * @method calculateAverageZ
       * @return {Number}
       */
      calculateAverageZ: function()
      {
         var av = 0;
         var worldcoords = this.worldcoords
         
         for (var i=0, len=this.points.length; i<len; i++)
         {
            av += worldcoords[i].z;
         }
         
         this.averagez = av / this.points.length;
      }
   });
})();


/**
 * K3D.LightSource class
 * 
 * A simple linear lighting model lightsource for solid object rendering.
 */
(function()
{
   /**
    * K3D.LightSource Constructor
    * 
    * @param location {Object} Location of the light {x,y,z}
    * @param color {Array} Colour of the light - each component specified from 0.0->1.0 in an array [r,g,b]
    * @param intensity {Number} Light itensity - float value generally 0.0->100.0
    */
   K3D.LightSource = function(location, color, intensity)
   {
      K3D.LightSource.superclass.constructor.call(this);
      
      this.location = location;
      this.color = color;
      this.intensity = intensity;
      
      return this;
   };
   
   /**
    * K3D.LightSource prototype
    */
   extend(K3D.LightSource, K3D.BaseObject,
   {
      /* light colour [r,g,b] */
      color: null,
      
      /* light intensity 0.0-1.0 */
      intensity: null,
      
      /** location coordinate {x, y, z} */
      location: null,
      
      /** transformed location to world coordinates as a Vector3D */
      worldvector: null,
      
      /**
       * Transform object coords to world coords based on current offsets and rotation matrix.
       * 
       * @method transformToWorld
       */
      transformToWorld: function()
      {
         var matrix = this.matrix;
         
         // transform light location
         var x = this.location.x + this.aboutx;
         var y = this.location.y + this.abouty;
         var z = this.location.z + this.aboutz;
         
         // perform matrix multiplication and add the offsets which allow an object
         // to rotate at a distance from the local origin
         this.worldvector = new Vector3D(
            (matrix[0][0]*x) + (matrix[0][1]*y) + (matrix[0][2]*z) + this.offx,
            (matrix[1][0]*x) + (matrix[1][1]*y) + (matrix[1][2]*z) + this.offy,
            (matrix[2][0]*x) + (matrix[2][1]*y) + (matrix[2][2]*z) + this.offz);
      }
   });
})();


/**
 * K3D.Renderer class
 * 
 * Interface for K3D object renderers.
 */
(function()
{
   /**
    * K3D.Renderer Constructor
    */
   K3D.Renderer = function()
   {
   };
   
   /**
    * K3D.Renderer prototype
    */
   K3D.Renderer.prototype =
   {
      /**
       * Sort an object by Z distance in preparation for rendering
       * 
       * @method sortByDistance
       * @param obj {K3D.K3DObject} The object to sort by Z distance
       */
      sortByDistance: function(obj)
      {
      },
      
      /**
       * Render the object artifacts to the given canvas context
       * 
       * @method renderObject
       * @param obj {K3D.K3DObject} The object to render
       * @param ctx {Object} Canvas context
       */
      renderObject: function(obj, ctx)
      {
      }
   };
})();


/**
 * K3D.PointRenderer class
 */
(function()
{
   /**
    * K3D.PointRenderer Constructor
    */
   K3D.PointRenderer = function()
   {
      K3D.PointRenderer.superclass.constructor.call(this);
      
      return this;
   };
   
   extend(K3D.PointRenderer, K3D.Renderer,
   {
      /**
       * Sort an object by Z distance in preparation for rendering
       * 
       * @method sortByDistance
       * @param obj {K3D.K3DObject} The object to sort by Z distance
       */
      sortByDistance: function(obj)
      {
         // quick sort the edges
         if (obj.shademode !== "plain")
         {
            this.quickSortObject(obj.screencoords, obj.worldcoords, 0, obj.points.length - 1);
         }
      },
      
      /**
       * Reverse quicksort implementation - the points are sorted by Z coordinates
       * 
       * @method quickSortObject
       * @param screencoords {Array} screencoords
       * @param a {Array} array to sort
       * @param left {int} leftindex
       * @param right {int} rightindex
       */
      quickSortObject: function(screencoords, a, left, right)
      {
         var leftIndex = left, rightIndex = right, partionElement;
         var tempP;
         
         if (right > left)
         {
            // get midpoint of the array
            partionElement = a[(left + right) >> 1].z / 2;
            
            // loop through the array until indices cross
            while (leftIndex <= rightIndex)
            {
               // find the first element that is < the partionElement starting
               // from the leftIndex (Z coord of point)
               while (leftIndex < right && a[leftIndex].z > partionElement)
                  leftIndex++;
               
               // find an element that is greater than the
               // partionElement starting from the rightIndex
               while (rightIndex > left && a[rightIndex].z < partionElement)
                  rightIndex--;
               
               // if the indexes have not crossed, swap
               if (leftIndex <= rightIndex)
               {
                  // swap world and screen objects
                  // this is required as points are not an index into worldcoords like
                  // edges and faces - so if worldcoords are swapped, so must be screencoords
                  tempP = screencoords[leftIndex];
                  screencoords[leftIndex] = screencoords[rightIndex];
                  screencoords[rightIndex] = tempP;
                  tempP = a[leftIndex];
                  a[leftIndex] = a[rightIndex];
                  a[rightIndex] = tempP;
                  leftIndex++;
                  rightIndex--;
               }
            }
            
            // if the right index has not reached the left side of the array then
            // must sort the left partition.
            if (left < rightIndex)
            {
               this.quickSortObject(screencoords, a, left, rightIndex);
            }
            
            // if the left index has not reached the left side of the array then 
            // must sort the left partition. 
            if (leftIndex < right)
            {
               this.quickSortObject(screencoords, a, leftIndex, right);
            }
         }
      },
      
      /**
       * Render the object points to the given canvas context
       * 
       * @method renderObject
       * @param obj {K3D.K3DObject} The object to render
       * @param ctx {Object} Canvas context
       */
      renderObject: function(obj, ctx)
      {
         var zdist, c, w;
         var screencoords = obj.screencoords, worldcoords = obj.worldcoords,
             scrn = obj.screenx, scrncol = scrn >> 6, linescale = obj.linescale / 255;
         
         for (var i=0, len=obj.points.length; i<len; i++)
         {
            // calculate colour/size to use for shading - based on z distance
            c = worldcoords[i].z + scrn;
            c = c / scrncol;
            
            switch (obj.shademode)
            {
               case "lightsource":  // not supported by points, so fallback to plain
               case "plain":
               {
                  ctx.fillStyle = "rgb(" + obj.color[0] + "," + obj.color[1] + "," + obj.color[2] + ")";
                  break;
               }
               
               case "depthcue":
               {
                  if (c < 0) c = 0;
                  if (c > 255) c = 255;
                  c = 255 - Math.ceil(c);
                  ctx.fillStyle = K3D.DEPTHCUE[c];
                  break;
               }
            }
            
            // size of point dependant on z distance
            w = linescale * c;
            
            // draw a point
            //ctx.fillRect(screencoords[i].x, screencoords[i].y, w, w);
            ctx.beginPath();
            ctx.arc(screencoords[i].x, screencoords[i].y, w, 0, TWOPI, true);
            ctx.closePath();
            ctx.fill();
         }
      }
   });
})();


/**
 * K3D.WireframeRenderer class
 */
(function()
{
   /**
    * K3D.WireframeRenderer Constructor
    */
   K3D.WireframeRenderer = function()
   {
      K3D.WireframeRenderer.superclass.constructor.call(this);
      
      return this;
   };
   
   extend(K3D.WireframeRenderer, K3D.Renderer,
   {
      /**
       * Sort an object by Z distance in preparation for rendering
       * 
       * @method sortByDistance
       * @param obj {K3D.K3DObject} The object to sort by Z distance
       */
      sortByDistance: function(obj)
      {
         // quick sort the edges
         // TODO: will need sort if take wireframe colours from face edges or similar
         if (obj.shademode != "plain")
         {
            this.quickSortObject(obj.worldcoords, obj.edges, 0, obj.edges.length - 1);
         }
      },
      
      /**
       * Reverse quicksort implementation - the Z coordinates of the edges points are averaged.
       * 
       * @method quickSortObject
       * @param worldcoords {Array} World coordinate list for the object
       * @param a {Array} array to sort
       * @param left {int} leftindex
       * @param right {int} rightindex
       */
      quickSortObject: function(worldcoords, a, left, right)
      {
         var leftIndex = left, rightIndex = right, partionElement;
         var tempEdge;
         
         if (right > left)
         {
            // get midpoint of the array (use as reference to Z coord!)
            partionElement = ((worldcoords[ (a[(left + right) >> 1].a) ].z) +
                              (worldcoords[ (a[(left + right) >> 1].b) ].z)) / 2;
            
            // loop through the array until indices cross
            while (leftIndex <= rightIndex)
            {
               // find the first element that is < the partionElement starting
               // from the leftIndex (average Z coords of edge for element)
               while ((leftIndex < right) &&
                      ((worldcoords[ (a[leftIndex].a) ].z +
                        worldcoords[ (a[leftIndex].b) ].z) / 2 > partionElement))
                  leftIndex++;
               
               // find an element that is greater than the
               // partionElement starting from the rightIndex
               while ((rightIndex > left) &&
                      ((worldcoords[ (a[rightIndex].a) ].z +
                        worldcoords[ (a[rightIndex].b) ].z) / 2 < partionElement))
                  rightIndex--;
               
               // if the indexes have not crossed, swap
               if (leftIndex <= rightIndex)
               {
                  // swap edges objects
                  tempEdge = a[leftIndex];
                  a[leftIndex] = a[rightIndex];
                  a[rightIndex] = tempEdge;
                  leftIndex++;
                  rightIndex--;
               }
            }
            
            // if the right index has not reached the left side of the array then
            // must sort the left partition.
            if (left < rightIndex)
            {
               this.quickSortObject(worldcoords, a, left, rightIndex);
            }
            
            // if the left index has not reached the left side of the array then 
            // must sort the left partition. 
            if (leftIndex < right)
            {
               this.quickSortObject(worldcoords, a, leftIndex, right);
            }
         }
      },
      
      /**
       * Render the edges to the given canvas context
       * 
       * @method renderObject
       * @param obj {K3D.K3DObject} The object to render
       * @param ctx {Object} Canvas context
       */
      renderObject: function(obj, ctx)
      {
         var c, a, b;
         var edges = obj.edges, screencoords = obj.screencoords, worldcoords = obj.worldcoords;
         var scrn = obj.screenx, scrncol = scrn >> 6, linescale = obj.linescale / 255;
         
         for (var i=0, len=edges.length; i<len; i++)
         {
            a = edges[i].a;
            b = edges[i].b;
            
            switch (obj.shademode)
            {
               case "lightsource":  // not supported by wireframe, so fallback to plain
               case "plain":
               {
                  c = obj.color;
                  ctx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
                  break;
               }
               
               case "depthcue":
               {
                  // calculate colour to use for shading
                  c = ((worldcoords[a].z + worldcoords[b].z) / 2) + scrn;
                  c = c / scrncol;
                  if (c < 0) c = 0;
                  if (c > 255) c = 255;
                  c = 255 - Math.ceil(c);
                  ctx.strokeStyle = K3D.DEPTHCUE[c];
                  ctx.lineWidth = linescale * c;
                  break;
               }
            }
            
            // draw an edge
            ctx.beginPath();
            ctx.moveTo(screencoords[a].x, screencoords[a].y);
            ctx.lineTo(screencoords[b].x, screencoords[b].y);
            ctx.closePath();
            ctx.stroke();
         }
      }
   });
})();


/**
 * K3D.SolidRenderer class
 */
(function()
{
   /**
    * K3D.SolidRenderer Constructor
    */
   K3D.SolidRenderer = function()
   {
      K3D.SolidRenderer.superclass.constructor.call(this);
      
      return this;
   };
   
   extend(K3D.SolidRenderer, K3D.Renderer,
   {
      /**
       * Sort an object by Z distance in preparation for rendering
       * 
       * @method sortByDistance
       * @param obj {K3D.K3DObject} The object to sort by Z distance
       */
      sortByDistance: function sortByDistance(obj)
      {
         this.quickSortObject(obj.worldcoords, obj.faces, 0, obj.faces.length - 1);
      },
      
      /**
       * Reverse quicksort implementation - the Z coordinates of the face points are averaged.
       * 
       * @method quickSortObject
       * @param worldcoords {Array} World coordinate list for the object
       * @param a {Array} array to sort
       * @param left {int} leftindex
       * @param right {int} rightindex
       */
      quickSortObject: function quickSortObject(worldcoords, a, left, right)
      {
         var leftIndex = left, rightIndex = right, partionElement,
             tempFace, vertices, testElement;
         
         if (right > left)
         {
            // get midpoint of the array
            vertices = a[(left + right) >> 1].vertices;
            for (var i=0, j=vertices.length, count=0; i<j; i++)
            {
               count += worldcoords[ vertices[i] ].z;
            }
            partionElement = count / vertices.length;
            
            // loop through the array until indices cross
            while (leftIndex <= rightIndex)
            {
               // find the first element that is < the partionElement starting
               // from the leftIndex (average Z coords of edge for element)
               while (true)
               {
                  vertices = a[leftIndex].vertices;
                  for (var i=0, j=vertices.length, count=0; i<j; i++)
                  {
                     count += (worldcoords[ vertices[i] ].z);
                  }
                  testElement = count / vertices.length;
                  if (leftIndex < right && testElement > partionElement)
                  {
                     leftIndex++;
                  }
                  else
                  {
                     break;
                  }
               }
               
               // find an element that is greater than the
               // partionElement starting from the rightIndex
               while (true)
               {
                  vertices = a[rightIndex].vertices;
                  for (var i=0, j=vertices.length, count=0; i<j; i++)
                  {
                     count += worldcoords[ vertices[i] ].z;
                  }
                  testElement = count / vertices.length;
                  if (rightIndex > left && testElement < partionElement)
                  {
                     rightIndex--;
                  }
                  else
                  {
                     break;
                  }
               }
               
               // if the indexes have not crossed, swap
               if (leftIndex <= rightIndex)
               {
                  // swap face objects
                  tempFace = a[leftIndex];
                  a[leftIndex] = a[rightIndex];
                  a[rightIndex] = tempFace;
                  leftIndex++;
                  rightIndex--;
               }
            }
            
            // if the right index has not reached the left side of the array then
            // must sort the left partition.
            if (left < rightIndex)
            {
               this.quickSortObject(worldcoords, a, left, rightIndex);
            }
            
            // if the left index has not reached the left side of the array then 
            // must sort the left partition. 
            if (leftIndex < right)
            {
               this.quickSortObject(worldcoords, a, leftIndex, right);
            }
         }
      },
      
      /**
       * Render the object faces to the given canvas context
       * 
       * @method renderObject
       * @param obj {K3D.K3DObject} The object to render
       * @param ctx {Object} Canvas context
       */
      renderObject: function renderObject(obj, ctx)
      {
         var faces = obj.faces, screencoords = obj.screencoords, worldcoords = obj.worldcoords;
         var scrn = obj.screenx, scrncol = scrn >> 6;
         var viewerVector = new Vector3D(0, 0, 1);
         var vertices, r,g,b,c, PIDIV2 = Math.PI/2, fillStyle;
         var lights = obj.controller.lights;
         var doublesided = obj.doublesided;
         
         for (var n=0, len=faces.length, face; n<len; n++)
         {
            face = faces[n];
            vertices = face.vertices;
            
            // perform hidden surface removal first - discard non visible faces
            // angle test is adjusted slightly to account for perspective
            var angle = viewerVector.thetaTo(face.worldnormal);
            if (doublesided || (angle + 0.15 > PIDIV2))
            {
               switch (obj.shademode)
               {
                  case "plain":
                  {
                     if (face.texture === null)
                     {
                        // apply plain colour directly from poly
                        c = face.color;
                        fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
                        this.renderPolygon(ctx, obj, face, fillStyle)
                     }
                     else
                     {
                        this.renderPolygon(ctx, obj, face);
                     }
                     break;
                  }
                  
                  case "depthcue":
                  {
                     // calculate colour to use based on av Z distance of polygon
                     for (var i=0, j=vertices.length, count=0; i<j; i++)
                     {
                        count += worldcoords[ vertices[i] ].z;
                     }
                     var col = ((count / vertices.length) + scrn) / scrncol;
                     if (col < 0) col = 0;
                     if (col > 255) col = 255;
                     if (face.texture === null)
                     {
                        // plain depth cued colour fill
                        col = (255 - col) / 255;
                        c = face.color;
                        r = Math.ceil(col * c[0]);
                        g = Math.ceil(col * c[1]);
                        b = Math.ceil(col * c[2]);
                        fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                     }
                     else
                     {
                        // calculate depth cue overlay fillstyle for texture
                        col = 255 - Math.ceil(col);
                        fillStyle = "rgba(0,0,0," + (1.0 - (col / 255)) + ")";
                     }
                     this.renderPolygon(ctx, obj, face, fillStyle);
                     break;
                  }
                  
                  case "lightsource":
                  {
                     // are there any lightsources defined?
                     if (lights.length === 0)
                     {
                        // calculate colour to use based on normal vector to default view-point vector
                        // use angle already calculated as they are identical
                        c = face.color;
                        r = Math.ceil(angle * (c[0] / Math.PI));
                        g = Math.ceil(angle * (c[1] / Math.PI));
                        b = Math.ceil(angle * (c[2] / Math.PI));
                        if (face.texture === null)
                        {
                           // lit colour fill
                           fillStyle = "rgb(" + r + "," + g + "," + b + ")";
                        }
                        else
                        {
                           // calculate lit overlay fillstyle for texture
                           fillStyle = "rgba(0,0,0," + (1.0 - angle * (1.0 / Math.PI)) + ")";
                        }
                        this.renderPolygon(ctx, obj, face, fillStyle);
                     }
                     else
                     {
                        // perform a pass for each light - a simple linear-additive lighting model
                        r = 0; g = 0; b = 0;
                        for (var i=0, j=lights.length, light, lit; i<j; i++)
                        {
                           light = lights[i];
                           // TODO: investigate angle inversion
                           angle = Math.PI - light.worldvector.thetaTo(face.worldnormal);
                           // surface is lit by the current light - apply lighting model based on theta angle
                           // linear distance falloff - each light is additive to the total
                           lit = angle * ((1.0 / light.worldvector.distance(face.worldnormal)) * light.intensity) / Math.PI;
                           // apply each colour component based on light colour (specified as 0.0->1.0 value)
                           r += (lit * light.color[0]);
                           g += (lit * light.color[1]);
                           b += (lit * light.color[2]);
                        }
                        
                        // clamp max lit values
                        if (r > 1.0) r = 1.0;
                        if (g > 1.0) g = 1.0;
                        if (b > 1.0) b = 1.0;
                        
                        // finally multiply into the original face colour - converting to 0-255 range
                        c = face.color;
                        var rgb = Math.ceil(r*c[0]) + "," + Math.ceil(g*c[1]) + "," + Math.ceil(b*c[2]);
                        if (face.texture === null)
                        {
                           // lit colour fill
                           fillStyle = "rgb(" + rgb + ")";
                        }
                        else
                        {
                           // calculate lit overlay fillstyle for texture
                           fillStyle = "rgba(" + rgb + "," + (1.0 - (r + g + b) / 3) + ")";
                        }
                        this.renderPolygon(ctx, obj, face, fillStyle);
                     }
                     break;
                  }
               }
            }
         }
      },
      
      /**
       * Render a polygon faces to the given canvas context.
       * 
       * If a texture is present, it is rendered and the given fillStyle is also applied
       * as an overlay (transparency is assumed in the given fillStyle) to provide a lighting
       * effect on the texture.
       * If no texture is present, the polygon is rendered with the given fillStyle.
       * 
       * @method renderPolygon
       * @param ctx {Object} Canvas context
       * @param obj {K3D.K3DObject} The object to render
       * @param face {Object} The face object representing the polygon to render
       * @param fillStyle {string} To apply as either plain fill or texture overlay
       */
      renderPolygon: function renderPolygon(ctx, obj, face, fillStyle)
      {
         var screencoords = obj.screencoords, vertices = face.vertices;
         
         ctx.save();
         ctx.beginPath();
         // move to first point in the polygon
         ctx.moveTo(screencoords[vertices[0]].x, screencoords[vertices[0]].y);
         for (var i=1, j=vertices.length; i<j; i++)
         {
            // move to each additional point
            ctx.lineTo(screencoords[vertices[i]].x, screencoords[vertices[i]].y);
         }
         // no need to plot back to first point - as path closes shape automatically
         ctx.closePath();
         if (face.texture === null)
         {
            // plain colour fill - fill style generally based on rgb lighting and alpha intensity
            ctx.fillStyle = fillStyle;
            ctx.fill();
            //ctx.fill();
            ctx.strokeStyle = fillStyle;
            ctx.stroke();
         }
         else
         {
            // textured fill - clip to the shape boundry
            ctx.clip();
            
            // TODO: try alternative method from parpevision to calculate texture bounds
            // TODO: figure out if drawImage goes faster if we specify the rectangle that bounds the source coords.
            // TODO: true uv coordinates?! (currently adjusted inwards of texture image width/height)
            var bitmap = obj.textures[ face.texture ];
            var sx0 = 16, sy0 = 16, sx1 = bitmap.width - 16, sy1 = 16, sx2 = bitmap.width - 16, sy2 = bitmap.height - 16;
            var x0 = screencoords[vertices[0]].x, y0 = screencoords[vertices[0]].y,
                x1 = screencoords[vertices[1]].x, y1 = screencoords[vertices[1]].y,
                x2 = screencoords[vertices[2]].x, y2 = screencoords[vertices[2]].y;
            
            var denom = bitmap.denom;
            if (denom === undefined)
            {
               denom = sx0 * (sy2 - sy1) - sx1 * sy2 + sx2 * sy1 + (sx1 - sx2) * sy0;
               bitmap.denom = denom;
            }
            var m11 = - (sy0 * (x2 - x1) - sy1 * x2 + sy2 * x1 + (sy1 - sy2) * x0) / denom;
            var m12 = (sy1 * y2 + sy0 * (y1 - y2) - sy2 * y1 + (sy2 - sy1) * y0) / denom;
            var m21 = (sx0 * (x2 - x1) - sx1 * x2 + sx2 * x1 + (sx1 - sx2) * x0) / denom;
            var m22 = - (sx1 * y2 + sx0 * (y1 - y2) - sx2 * y1 + (sx2 - sx1) * y0) / denom;
            var dx = (sx0 * (sy2 * x1 - sy1 * x2) + sy0 * (sx1 * x2 - sx2 * x1) + (sx2 * sy1 - sx1 * sy2) * x0) / denom;
            var dy = (sx0 * (sy2 * y1 - sy1 * y2) + sy0 * (sx1 * y2 - sx2 * y1) + (sx2 * sy1 - sx1 * sy2) * y0) / denom;
            
            ctx.transform(m11, m12, m21, m22, dx, dy);
            
            // Draw the whole texture image. Transform and clip will map it onto the correct output polygon.
            ctx.drawImage(bitmap, 0, 0);
            
            // apply optionally fill style to shade and light the texture image
            if (fillStyle)
            {
               ctx.fillStyle = fillStyle;
               ctx.fill();
            }
         }
         ctx.restore();
      }
   });
})();