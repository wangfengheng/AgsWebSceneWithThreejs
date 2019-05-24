define([
  "esri/core/declare",
  "esri/geometry/SpatialReference",
  //"esri/geometry/webMercatorUtils",//目录变了
  "esri/geometry/support/webMercatorUtils",
  "esri/views/3d/externalRenderers"
], function(declare, SpatialReference, webMercatorUtils, externalRenderers) {
  var THREE = window.THREE;

  return declare({
    renderer: null, // three.js renderer
    camera: null, // three.js camera
    scene: null, // three.js scene
    ambient: null, // three.js ambient light source
    sun: null, // three.js sun light source
    meshArray: [],
    tickArray: null,
    positionCountArray: null,
    //modelMoveSpeed: 0.1,//数字越大 移动速度相对快
    //modelMoveSpeed: 0.03,//数字越大 移动速度相对快
    modelMoveSpeed: 0.02, //数字越大 移动速度相对快
    //modelMoveSpeed: 0.003,//数字越大 移动速度相对快
    //modelMoveSpeed: 0.0006,//数字越小 移动速度相对慢

    constructor: function(
      view,
      hotTrafficLines,
      cityNamesStartArray,
      cityNamesEndArray
    ) {
      //用于传入参数用的函数，名称固定不可更改
      this.view = view;
      this.hotTrafficLines = hotTrafficLines;
      this.cityNamesStartArray = cityNamesStartArray;
      this.cityNamesEndArray = cityNamesEndArray;
      this.rate4rail = 271633.6496382893 / 100;
      this.clock = new THREE.Clock();
      this.positionCountArray = [];
      this.tickArray = [];
      for (var t = 0; t < 10; t++) {
        this.positionCountArray.push(0);
        this.tickArray.push(0);
      }

      console.log(this.hotTrafficLines);
      this.index = 0;
      this.refresh = Date.now();
    },
    setup: function(context) {
      //externalRenderers必须要存在的函数
      // initialize the three.js renderer
      //////////////////////////////////////////////////////////////////////////////////////
      this.renderer = new THREE.WebGLRenderer({
        context: context.gl,
        premultipliedAlpha: false
      });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(
        context.camera.fullWidth,
        context.camera.fullHeight
      );

      this.renderer.autoClearDepth = false;
      this.renderer.autoClearStencil = false;
      this.renderer.autoClearColor = false;

      var originalSetRenderTarget = this.renderer.setRenderTarget.bind(
        this.renderer
      );
      this.renderer.setRenderTarget = function(target) {
        originalSetRenderTarget(target);
        if (target == null) {
          context.bindRenderTarget();
        }
      };

      // setup the three.js scene
      ///////////////////////////////////////////////////////////////////////////////////////
      this.scene = new THREE.Scene();
      //this.scene.add(new THREE.AxesHelper(9000000));//添加辅助坐标轴
      this._createCamera(context);
      this._createLights();
      this._createObjects();
      context.resetWebGLState();
    },
    render: function(context) {
      //externalRenderers必须要存在的函数
      this._updateCamera(context);
      this._updateLights(context);
      this._updateObjects(context);

      // draw the scene
      /////////////////////////////////////////////////////////////////////////////////////////////////////
      this.renderer.state.reset(); //.resetGLState()已被弃用，替换为.state.reset()
      this.renderer.render(this.scene, this.camera);
      // as we want to smoothly animate the ISS movement, immediately request a re-render
      externalRenderers.requestRender(this.view);

      // cleanup
      context.resetWebGLState();
    },
    _createCamera: function(context) {
      // 设置相机 the camera
      var cam = context.camera;
      this.camera = new THREE.PerspectiveCamera(
        cam.fovY,
        cam.aspect,
        cam.near,
        cam.far
      );
    },

    //创建光照
    _createLights: function() {
      //环境光
      this.ambient = new THREE.AmbientLight();
      this.scene.add(this.ambient);
      //------------------
      //平行光
      this.sun = new THREE.DirectionalLight();
      this.scene.add(this.sun);
    },
    //创建三维物体
    _createObjects: function() {
      var hotTrafficLines = this.hotTrafficLines;
      var hotTrafficLine = null;
      var pathTemp = null;
      var attributesTemp = null;
      var pathLengthTemp = null;
      var lineStartTemp = null;
      var lineStartFinal = null;
      var lineStartVector3 = null;
      var lineEndTemp = null;
      var lineEndFinal = null;
      var lineEndVector3 = null;
      var lineMiddleTemp = null;
      var lineMiddleFinal = null;
      var lineMiddleVector3 = null;
      var hotTrafficLineFinal = null;
      var transform = null;
      var material = null;
      var curve = null;
      var lightObj = null;
      var model4obj = null;
      var particleSystem = null;
      var options4particle = null;
      var spawnerOptions4particle = null;

      var colorTemp = null;
      var colorFinal = null;
      //主要three.js 对象 创建 start
      for (var i = 0; i < hotTrafficLines.length; i++) {
        //for(var i=0;i<1;i++){
        hotTrafficLine = hotTrafficLines[i];
        pathTemp = hotTrafficLine.geometry.paths[0];
        attributesTemp = hotTrafficLine.attributes;

        //0314方法 start
        pathLengthTemp = pathTemp.length;
        if (
          attributesTemp["start"] == "郑州" ||
          attributesTemp["start"] == "深圳"
        ) {
          lineStartTemp = pathTemp[pathLengthTemp - 1];
          lineEndTemp = pathTemp[0];
        } else {
          lineStartTemp = pathTemp[0];
          lineEndTemp = pathTemp[pathLengthTemp - 1];
        }
        lineMiddleTemp = pathTemp[Math.round((pathLengthTemp - 1) / 2)];
        //lineMiddleTemp = [];
        //lineMiddleTemp.push((lineStartTemp[0]+lineEndTemp[0])/2);
        //lineMiddleTemp.push((lineStartTemp[1]+lineEndTemp[1])/2);
        //需要转为经纬度坐标
        lineStartFinal = webMercatorUtils.xyToLngLat(
          lineStartTemp[0],
          lineStartTemp[1]
        );
        lineStartFinal.push(2000);
        lineEndFinal = webMercatorUtils.xyToLngLat(
          lineEndTemp[0],
          lineEndTemp[1]
        );
        lineEndFinal.push(2000);
        lineMiddleFinal = webMercatorUtils.xyToLngLat(
          lineMiddleTemp[0],
          lineMiddleTemp[1]
        );
        lineMiddleFinal.push(9000); //中间的拐点拔高
        //0314方法 end

        //转换为three.js坐标
        transform = new THREE.Matrix4();
        transform.fromArray(
          externalRenderers.renderCoordinateTransformAt(
            this.view,
            lineStartFinal,
            SpatialReference.WGS84,
            new Array(16)
          )
        );
        lineStartVector3 = new THREE.Vector3(
          transform.elements[12],
          transform.elements[13],
          transform.elements[14]
        );
        transform = new THREE.Matrix4();
        transform.fromArray(
          externalRenderers.renderCoordinateTransformAt(
            this.view,
            lineEndFinal,
            SpatialReference.WGS84,
            new Array(16)
          )
        );
        lineEndVector3 = new THREE.Vector3(
          transform.elements[12],
          transform.elements[13],
          transform.elements[14]
        );
        //计算空间距离 start
        var distanceTemp = Math.sqrt(
          Math.pow(lineStartVector3.x - lineEndVector3.x, 2) +
            Math.pow(lineStartVector3.y - lineEndVector3.y, 2) +
            Math.pow(lineStartVector3.z - lineEndVector3.z, 2)
        );

        //计算空间距离 end
        transform = new THREE.Matrix4();
        transform.fromArray(
          externalRenderers.renderCoordinateTransformAt(
            this.view,
            lineMiddleFinal,
            SpatialReference.WGS84,
            new Array(16)
          )
        );
        lineMiddleVector3 = new THREE.Vector3(
          transform.elements[12],
          transform.elements[13],
          transform.elements[14]
        );

        //添加点光源到场景中 start
        var materialTemp = new THREE.MeshNormalMaterial();
        var geometryTemp = new THREE.SphereGeometry(2000, 32, 16);
        lightObj = new THREE.Mesh(geometryTemp, materialTemp);
        this.scene.add(lightObj);
        //添加点光源到场景中 end
        //添加粒子系统到场景中 start
        colorTemp = get0xColor("mapblue");
        colorFinal = colorTemp.replace(/#/, "0x") * 1;
        particleSystem = new THREE.GPUParticleSystem({
          maxParticles: 250000
        });
        options4particle = {
          position: new THREE.Vector3(),
          positionRandomness: 3,
          velocity: new THREE.Vector3(),
          velocityRandomness: 30,
          //color: 0xff0000,
          color: colorFinal,
          colorRandomness: 0, //这个设置为0 就可以了
          //turbulence: .9,//震动
          turbulence: 150,
          //lifetime: 10,
          lifetime: 1,
          //lifetime:.5,
          //size: 1,
          size: 20,
          sizeRandomness: 1
        };
        spawnerOptions4particle = {
          spawnRate: 3000, //粒子个数
          horizontalSpeed: 1.5,
          verticalSpeed: 1.33,
          timeScale: 1
        };
        this.scene.add(particleSystem);

        //添加粒子系统到场景中 end

        curve = new THREE.CatmullRomCurve3([
          //取代的是CatmullRomCurve3
          lineStartVector3,
          lineMiddleVector3,
          lineEndVector3
        ]);
        console.log(
          attributesTemp["start"] +
            "到" +
            attributesTemp["to_"] +
            "曲线的长度是：" +
            curve.getLength()
        );

        var geometry = new THREE.Geometry();
        geometry.vertices = curve.getPoints(60);
        var material = new THREE.LineDashedMaterial({
          linewidth: 500,
          color: get0xColor("mapblue")
        });
        var line = new THREE.Line(geometry, material);
        this.scene.add(line);
        //曲线 end

        hotTrafficLineFinal = hotTrafficLine;
        hotTrafficLineFinal.mesh = line;
        hotTrafficLineFinal.light = lightObj;

        hotTrafficLineFinal.particleSystem = particleSystem;
        hotTrafficLineFinal.options4particle = options4particle;
        hotTrafficLineFinal.spawnerOptions4particle = spawnerOptions4particle;

        hotTrafficLineFinal.model = model4obj;
        hotTrafficLineFinal.curve = curve;
        hotTrafficLineFinal.isAreaShowed = false;
        this.meshArray.push(hotTrafficLineFinal);
      }
      //主要three.js 对象 创建 end
    },
    //更新三维物体
    _updateObjects: function(context) {
      var meshArray = this.meshArray;
      var hotTrafficLineFinal = null;
      var curve = null;
      var particleSystem = null;
      var options4particle = null;
      var spawnerOptions4particle = null;
      var deltaFinal = null;

      //再更新 复杂的粒子系统 start
      var delta = this.clock.getDelta();
      for (var i = 0; i < meshArray.length; i++) {
        //for(var i=0;i<1;i++){
        hotTrafficLineFinal = meshArray[i];
        lightObj = hotTrafficLineFinal.light;

        particleSystem = hotTrafficLineFinal.particleSystem;
        options4particle = hotTrafficLineFinal.options4particle;
        spawnerOptions4particle = hotTrafficLineFinal.spawnerOptions4particle;

        meshObj = hotTrafficLineFinal.mesh;
        model4obj = hotTrafficLineFinal.model;
        curve = hotTrafficLineFinal.curve;

        deltaFinal = delta * spawnerOptions4particle.timeScale; 

        this.tickArray[i] += deltaFinal;
        if (this.tickArray[i] < 0) this.tickArray[i] = 0;
        if (this.positionCountArray[i] < 1) {
          //更新 粒子系统 start
          options4particle.position.x = curve.getPointAt(
            this.positionCountArray[i]
          ).x;
          options4particle.position.y = curve.getPointAt(
            this.positionCountArray[i]
          ).y;
          options4particle.position.z = curve.getPointAt(
            this.positionCountArray[i]
          ).z;

          for (var x = 0; x < spawnerOptions4particle.spawnRate * delta; x++) {
            particleSystem.spawnParticle(options4particle);
          }
          particleSystem.update(this.tickArray[i]);
          //更新 粒子系统 end
          this.positionCountArray[i] += this.modelMoveSpeed;
        } else {
          this.positionCountArray[i] = 0;
        }
      }
      //再更新 复杂的粒子系统 end
    },
    //更新光照
    _updateLights: function(context) {
      var light = context.sunLight;
      this.sun.position.set(
        light.direction[0],
        light.direction[1],
        light.direction[2]
      );
      this.sun.intensity = light.diffuse.intensity;
      this.sun.color = new THREE.Color(
        light.diffuse.color[0],
        light.diffuse.color[1],
        light.diffuse.color[2]
      );
      this.ambient.intensity = light.ambient.intensity;
      this.ambient.color = new THREE.Color(
        light.ambient.color[0],
        light.ambient.color[1],
        light.ambient.color[2]
      );
    },
    //更新相机
    _updateCamera: function(context) {
      var cam = context.camera;
      this.camera.position.set(cam.eye[0], cam.eye[1], cam.eye[2]);
      this.camera.up.set(cam.up[0], cam.up[1], cam.up[2]);
      this.camera.lookAt(
        new THREE.Vector3(cam.center[0], cam.center[1], cam.center[2])
      );
      // Projection matrix can be copied directly
      this.camera.projectionMatrix.fromArray(cam.projectionMatrix);
    }
  });
});
function get0xColor(name, flag) {
  var color = 0xffffff;
  if (name == "绿色" || name == "green") {
    color = 0x00ff00;
  } else if (name == "铁轨黄" || name == "yellow4rail") {
    color = 0xe0ca12;
    if (!flag) {
      color = "#E0CA12";
    }
  } else if (name == "黄色" || name == "yellow") {
    color = 0xffff00;
  } else if (name == "米黄色" || name == "riceyellow") {
    color = 0xfdf5b9;
    if (!flag) {
      color = "#FDF5B9";
    }
  } else if (name == "蓝色" || name == "blue") {
    color = 0x0040ff;
  } else if (name == "浅蓝色" || name == "lightblue") {
    color = 0x00ffff;
    if (!flag) {
      color = "#00ffff";
    }
  } else if (name == "深蓝色mapv" || name == "darkblue_mapv") {
    color = 0x3943f9;
    if (!flag) {
      color = "#3943F9";
    }
  } else if (name == "地图蓝" || name == "mapblue") {
    color = 0x46bee9;
    if (!flag) {
      color = "#46bee9";
    }
  } else if (name == "浅蓝色mapv" || name == "lightblue_mapv") {
    color = 0x3f80c2;
    if (!flag) {
      color = "#3F80C2";
    }
  } else if (name == "红色" || name == "red") {
    color = 0xff0000;
  } else if (name == "白色" || name == "white") {
    color = 0xffffff;
  } else if (name == "白色2" || name == "white2") {
    color = 0xf6f9ee;
  } else if (name == "白色3" || name == "white3") {
    color = 0xdbe1d4;
  } else if (name == "白色4" || name == "white4") {
    color = 0xcbd3c4;
  } else if (name == "白色5" || name == "white5") {
    color = 0xbac4b5;
  } else if (name == "浅灰色" || name == "lightgray") {
    color = 0x333333;
  } else if (name == "灰色" || name == "gray") {
    color = 0x808080;
  } else if (name == "银色" || name == "") {
    color = 0xc0c0c0;
  } else if (name == "紫色" || name == "") {
    color = 0x800080;
  }

  return color;
}
