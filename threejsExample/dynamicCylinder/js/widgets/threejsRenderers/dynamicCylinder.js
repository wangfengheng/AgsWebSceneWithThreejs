define([
  "esri/core/declare",
  "esri/geometry/SpatialReference",
  "esri/views/3d/externalRenderers"
], function (declare, SpatialReference, externalRenderers) {
  var THREE = window.THREE;

  return declare({
    renderer: null, // three.js renderer
    camera: null, // three.js camera
    scene: null, // three.js scene
    ambient: null, // three.js ambient light source
    sun: null, // three.js sun light source
    meshArray: [],
    meshArray4gradient: [],
    radiusCountInit: 1000,
    radiusCount: null,
    height4gradient: 10000,

    constructor: function (view, hotCities) {
      //用于传入参数用的函数，名称固定不可更改
      this.view = view;
      this.hotCities = hotCities;
      this.radiusCount = this.radiusCountInit;

      console.log(this.hotCities);
      this.index = 0;
      this.refresh = Date.now();
      //渐变色 material设置  start
      //红黄渐变色
      var canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;

      var context = canvas.getContext("2d");
      var gradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      );
      gradient.addColorStop(0.1, "rgba(255,255,0,1)");
      gradient.addColorStop(1, "rgba(255,106,106,1)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      var shadowTexture = new THREE.Texture(canvas);
      shadowTexture.needsUpdate = true;
      this.shadowMaterial4red = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 0.7
      });
      //蓝绿渐变色
      var canvas2 = document.createElement("canvas");
      canvas2.width = 128;
      canvas2.height = 128;

      var context2 = canvas2.getContext("2d");
      var gradient2 = context2.createRadialGradient(
        canvas2.width / 2,
        canvas2.height / 2,
        0,
        canvas2.width / 2,
        canvas2.height / 2,
        canvas2.width / 2
      );
      gradient2.addColorStop(0.1, "rgba(0,0,255,1)");
      gradient2.addColorStop(1, "rgba(0,255,127,1)");
      context2.fillStyle = gradient2;
      context2.fillRect(0, 0, canvas2.width, canvas2.height);
      var shadowTexture2 = new THREE.Texture(canvas2);
      shadowTexture2.needsUpdate = true;
      this.shadowMaterial4blue = new THREE.MeshBasicMaterial({
        map: shadowTexture2,
        transparent: true,
        opacity: 0.7
      });
      //渐变色 material设置  end
    },
    setup: function (context) {
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
      //
      var originalSetRenderTarget = this.renderer.setRenderTarget.bind(
        this.renderer
      );
      this.renderer.setRenderTarget = function (target) {
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
    render: function (context) {
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
    _createCamera: function (context) {
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
    _createLights: function () {
      //环境光
      this.ambient = new THREE.AmbientLight();
      this.scene.add(this.ambient);
      //------------------
      //平行光
      this.sun = new THREE.DirectionalLight();
      this.scene.add(this.sun);
    },
    //创建三维物体
    _createObjects: function () {
      var _self = this;

      var hotCities = this.hotCities;
      var hotCity = null;
      var hotCityFinal = null;
      var transform = null;
      var geometry4gradient = null;
      var geometry4cylinder = null;
      var geoData = null;
      var material4cylinder = null;
      var mesh4cylinder = null;
      var mesh4gradient = null;
      var cylinderColor = null;
      for (var i = 0; i < hotCities.length; i++) {
        hotCity = hotCities[i];
        //位置方法1
        geometry4cylinder = new THREE.CylinderBufferGeometry(
          30000,
          30000,
          100,
          32
        ); //圆柱
        cylinderColor = hotCity.cylinderColor;
        material4cylinder = _self._getMaterial4cylinder(cylinderColor);
        mesh4cylinder = new THREE.Mesh(geometry4cylinder, material4cylinder);
        geoData = [];
        geoData.push(hotCity.longitude);
        geoData.push(hotCity.latitude);
        geoData.push(0);
        transform = new THREE.Matrix4();
        transform.fromArray(
          externalRenderers.renderCoordinateTransformAt(
            this.view,
            geoData,
            SpatialReference.WGS84,
            new Array(16)
          )
        );
        mesh4cylinder.position.set(
          transform.elements[12],
          transform.elements[13],
          transform.elements[14]
        );

        mesh4cylinder.rotation.z = -Math.asin(
          Math.cos((geoData[1] / 180) * Math.PI) *
          Math.cos((geoData[0] / 180) * Math.PI)
        );
        mesh4cylinder.rotation.x = Math.atan(
          Math.tan((geoData[1] / 180) * Math.PI) /
          Math.sin((geoData[0] / 180) * Math.PI)
        );

        this.scene.add(mesh4cylinder);
        this.meshArray.push({ mesh: mesh4cylinder, cylinderHeight: hotCity.cylinderHeight });
      }
    },
    _getMaterial4cylinder: function (color) {
      var gradientArray = new gradientColor4generalTool(color, "#FFFFFF", 10); //和白色再渐变  (color,'#FFFF00',10);//和黄色再渐变
      var canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;

      var context = canvas.getContext("2d");
      var gradient = context.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width / 2
      );
      for (var i = 0; i < gradientArray.length / 2; i++) {
        gradient.addColorStop(
          0.1 * (i + 1),
          "rgba(" + translateHexToRgb(gradientArray[i]).toString() + ",1)"
        );
      }
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);
      var shadowTexture = new THREE.Texture(canvas);
      shadowTexture.needsUpdate = true;
      var shadowMaterial = new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        opacity: 1
      });
      return shadowMaterial;
    },
    //更新光照
    _updateLights: function (context) {
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
    //更新三维物体
    _updateObjects: function (context) {
      var speed = 1000;
      var heightTemp = null;
      var meshArray = this.meshArray;
      var hotCityFinal = null;
      var meshObj = null;
      for (var i = 0; i < meshArray.length; i++) {
        hotCityFinal = meshArray[i];
        meshObj = hotCityFinal.mesh;
        //之前的逻辑 start
        if (meshObj.geometry.parameters.height < (hotCityFinal.cylinderHeight + speed)) {
          heightTemp = meshObj.geometry.parameters.height + speed;
          //采用重新构建geometry的方法 而不是改scale，改scale的话 没有停下来的界限。
          meshObj.geometry = new THREE.CylinderBufferGeometry(30000, 30000, heightTemp, 32);//立方柱
        } else {
          // meshObj.geometry = new THREE.CylinderBufferGeometry(30000, 30000, 100, 32);//立方柱
        }
        //之前的逻辑 end
      }
    },
    //更新相机
    _updateCamera: function (context) {
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
//生成渐变色 start
/*
 // startColor：开始颜色hex
 // endColor：结束颜色hex
 // step:几个阶级（几步）
 */
function gradientColor4generalTool(startColor, endColor, step) {
  var startRGB = this.colorRgb(startColor); //转换为rgb数组模式
  var startR = startRGB[0];
  var startG = startRGB[1];
  var startB = startRGB[2];

  var endRGB = this.colorRgb(endColor);
  var endR = endRGB[0];
  var endG = endRGB[1];
  var endB = endRGB[2];

  var sR = (endR - startR) / step; //总差值
  var sG = (endG - startG) / step;
  var sB = (endB - startB) / step;

  var colorArr = [];
  for (var i = 0; i < step; i++) {
    //计算每一步的hex值
    var hex = this.colorHex(
      "rgb(" +
      parseInt(sR * i + startR) +
      "," +
      parseInt(sG * i + startG) +
      "," +
      parseInt(sB * i + startB) +
      ")"
    );
    colorArr.push(hex);
  }
  return colorArr;
}

// 将hex表示方式转换为rgb表示方式(这里返回rgb数组模式)
gradientColor4generalTool.prototype.colorRgb = function (sColor) {
  var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  var sColor = sColor.toLowerCase();
  if (sColor && reg.test(sColor)) {
    if (sColor.length === 4) {
      var sColorNew = "#";
      for (var i = 1; i < 4; i += 1) {
        sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
      }
      sColor = sColorNew;
    }
    //处理六位的颜色值
    var sColorChange = [];
    for (var i = 1; i < 7; i += 2) {
      sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
    }
    return sColorChange;
  } else {
    return sColor;
  }
};

// 将rgb表示方式转换为hex表示方式
gradientColor4generalTool.prototype.colorHex = function (rgbString) {
  var that = rgbString;
  //十六进制颜色值的正则表达式
  var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  // 如果是rgb颜色表示
  if (/^(rgb|RGB)/.test(that)) {
    var aColor = that.replace(/(?:\(|\)|rgb|RGB)*/g, "").split(",");
    var strHex = "#";
    for (var i = 0; i < aColor.length; i++) {
      var hex = Number(aColor[i]).toString(16);
      if (hex === "0") {
        hex += hex;
      }
      strHex += hex;
    }
    if (strHex.length !== 7) {
      strHex = that;
    }
    return strHex;
  } else if (reg.test(that)) {
    var aNum = that.replace(/#/, "").split("");
    if (aNum.length === 6) {
      return that;
    } else if (aNum.length === 3) {
      var numHex = "#";
      for (var i = 0; i < aNum.length; i += 1) {
        numHex += aNum[i] + aNum[i];
      }
      return numHex;
    }
  }
  return that;
};
gradientColor4generalTool.prototype.colorHex2 = function (rgb) {
  var _this = rgb;
  var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  if (/^(rgb|RGB)/.test(_this)) {
    var aColor = _this.replace(/(?:(|)|rgb|RGB)*/g, "").split(",");
    var strHex = "#";
    for (var i = 0; i < aColor.length; i++) {
      var hex = Number(aColor[i]).toString(16);
      hex = hex < 10 ? 0 + "" + hex : hex; // 保证每个rgb的值为2位
      if (hex === "0") {
        hex += hex;
      }
      strHex += hex;
    }
    if (strHex.length !== 7) {
      strHex = _this;
    }
    return strHex;
  } else if (reg.test(_this)) {
    var aNum = _this.replace(/#/, "").split("");
    if (aNum.length === 6) {
      return _this;
    } else if (aNum.length === 3) {
      var numHex = "#";
      for (var i = 0; i < aNum.length; i += 1) {
        numHex += aNum[i] + aNum[i];
      }
      return numHex;
    }
  } else {
    return _this;
  }
};
//生成渐变色 end
// 将hex表示方式转换为rgb表示方式(这里返回rgb数组模式)
function translateHexToRgb(sColor) {
  var reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
  var sColor = sColor.toLowerCase();
  if (sColor && reg.test(sColor)) {
    if (sColor.length === 4) {
      var sColorNew = "#";
      for (var i = 1; i < 4; i += 1) {
        sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
      }
      sColor = sColorNew;
    }
    //处理六位的颜色值
    var sColorChange = [];
    for (var i = 1; i < 7; i += 2) {
      sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
    }
    return sColorChange;
  } else {
    return sColor;
  }
}
