define([
  "dojo/_base/declare",
  "dijit/_WidgetBase",
  "esri/WebScene",
  "esri/views/SceneView",
  "esri/Graphic",
  "esri/layers/GraphicsLayer",
  "esri/layers/WebTileLayer",
  "esri/tasks/QueryTask",
  "esri/tasks/support/Query",
  "esri/views/3d/externalRenderers",
  "widgets/threejsRenderers/dynamicCylinder",
  "dojo/domReady!"
], function (
  declare,
  _WidgetBase,
  WebScene,
  SceneView,
  Graphic,
  GraphicsLayer,
  WebTileLayer,
  QueryTask,
  Query,
  externalRenderers,
  DynamicCylinder
) {
    return declare([_WidgetBase], {
      view4hotCities: null, //视图
      graphicsLayer_hotCities: null,
      featureLayerUrl_hotCities: null, //热点城市数据源 图层的url
      field4cityName: null, //城市的名称 字段
      field4sort: null, //排序 字段
      queryTask_hotCities: new QueryTask(),
      query_hotCities: new Query(),
      allFeatures_hotCities: null,
      slides4hotCities: null, //热点城市WebScene的幻灯片  数组
      slideIndex4hotCities: 2,
      slideLength4hotCities: null,

      constructor: function (option) {
        var _self = this;
        console.log("初始化hotCities模块(hotCities)");
        _self._init(option);
      },
      _init: function (option) {
        var _self = this;
        _self._initParams_hotCities(option);
        _self._createMap_hotCities(function (view) {
          if (view) {
            _self.view4hotCities = view;
            //添加热点城市图层 并过滤前10名城市
            _self._queryData_hotCities(function (allFeatures) {
              _self.allFeatures_hotCities = allFeatures;
              //处理数据并创建圆柱 
              _self._handleData_hotCities(_self.allFeatures_hotCities);
            });
          }
        });
      },
      _initParams_hotCities: function (option) {
        var _self = this;
        if (option.layerUrlHotCities) {
          //创建数据源要素图层
          _self.featureLayerUrl_hotCities = option.layerUrlHotCities;
        }
        if (option.field4cityName) {
          _self.field4cityName = option.field4cityName;
        }
        if (option.field4num) {
          _self.field4num = option.field4num;
        }
        if (option.field4sort) {
          _self.field4sort = option.field4sort;
        }
      },
      _createMap_hotCities: function (callback) {
        var _self = this;
        //创建地图的代码
        var map = new WebScene({
          // basemap: "osm"
        });
        //创建视图
        var view = new SceneView({
          container: "viewDiv", // 指定一个DOM节点，用id来匹配
          map: map, // 将上一步创建的地图放到视图容器中
          camera: {
            position: {
              // patialReference: { wkid: 102100 },// 少一个字母，默认是4326坐标系
              spatialReference: { wkid: 102100 },
              x: 12773872.648445556,
              y: 936135.6571187963,
              z: 1936833.2833312238
            },
            heading: 358.4414151166057,
            tilt: 43.730533242079936,
            rotation: 321.5239361253281
          }
        });
        view.on("click", function (evt) {
          console.log("view.camera:" + view.camera);
        });

        //创建视图
        var tiledLayer = new WebTileLayer({
          //捷泰 底图
          urlTemplate:
            "http://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{level}/{row}/{col}"
        });
        map.add(tiledLayer);
        _self.graphicsLayer_hotCities = new GraphicsLayer();
        // Add GraphicsLayer to map
        map.add(_self.graphicsLayer_hotCities);

        if (callback) {
          //关键是这个.then 没有的话 view的一些属性还未加载全！ 比如 spatialReference属性，屏幕坐标转换地理坐标时会用到！
          // view.then(callback(view));
          view.when(callback(view));
        }
      },
      //查询数据
      _queryData_hotCities: function (callback) {
        var _self = this;

        var queryTask = new QueryTask({
          url: _self.featureLayerUrl_hotCities
        });
        var query = new Query();
        query.returnGeometry = true;
        query.outFields = ["*"];
        query.orderByFields = ["" + _self.field4sort + " desc"];
        query.where = "1=1";
        query.num = 10; //前10名

        // When resolved, returns features and graphics that satisfy the query.
        queryTask.execute(query).then(function (results) {
          console.log(
            "数据查询完毕,开始使用数据,数据总数：" + results.features.length
          );
          if (callback) {
            callback(results.features);
          }
        });
      },
      //处理，组织数据 经纬度坐标，echarts的是经纬度坐标，不用转屏幕坐标
      _handleData_hotCities: function (allFeatures) {
        var _self = this;
        //渲染热门城市图层 start
        //渲染热门城市图层 end
        var hotCities = [];
        var hotCity = null;
        var featureTemp, cityNameTemp, longitudeTemp, latitudeTemp, zTemp;
        var pointObj4label, labelHeight, pointGraphic4label;
        var textSymbol = null;
        var gradientArray = new gradientColor4generalTool(
          "#e82400",
          "#8ae800",
          10
        );
        //然后都和白色进行渐变！！！！！！！！！！！！！！！！！ 尝试一下。
        var length = allFeatures.length;
        var colorTemp = null;
        for (var i = 0; i < length; i++) {
          featureTemp = allFeatures[i];

          longitudeTemp = featureTemp.geometry.longitude;
          latitudeTemp = featureTemp.geometry.latitude;
          cityNameTemp = featureTemp.attributes[_self.field4cityName];
          zTemp = featureTemp.attributes[_self.field4num];
          labelHeight = zTemp * 12;
          colorTemp = gradientArray[i];
          hotCity = {
            longitude: longitudeTemp,
            latitude: latitudeTemp,
            cityName: cityNameTemp,
            cylinderHeight: zTemp * 20,
            cylinderColor: colorTemp
          };
          hotCities.push(hotCity);

          pointObj4label = {
            type: "point", // autocasts as new Point()
            longitude: longitudeTemp,
            latitude: latitudeTemp,
            z: labelHeight
          };
          textSymbol = {
            type: "text",
            text: i + 1 + " " + featureTemp.attributes[_self.field4cityName],
            font: {
              size: 20,
              weight: "bolder",
              family: "微软雅黑"
            },
            color: get0xColor("riceyellow", false) //统一米黄色
          };
          var pointGraphic4label = new Graphic({
            geometry: pointObj4label,
            symbol: textSymbol
          });
          _self.graphicsLayer_hotCities.add(pointGraphic4label);
        }
        _self.hotCities4externalRenderers = hotCities;
        ////使用three.js绘制动态圆柱 start
        var dynamicCylinderLayer = new DynamicCylinder(
          _self.view4hotCities,
          _self.hotCities4externalRenderers
        );
        externalRenderers.add(_self.view4hotCities, dynamicCylinderLayer); //add时才出发 setup函数，否则不触发
        ////使用three.js绘制动态圆柱 end
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
