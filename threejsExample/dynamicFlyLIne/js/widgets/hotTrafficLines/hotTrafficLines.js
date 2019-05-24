define([
  "dojo/_base/declare",
  "dijit/_WidgetBase",
  "esri/Map",
  "esri/views/SceneView",
  "esri/layers/FeatureLayer", //加载要素图层类
  "esri/layers/WebTileLayer",
  "esri/tasks/QueryTask",
  "esri/tasks/support/Query",
  "esri/views/3d/externalRenderers",
  "widgets/threejsRenderers/dynamicLine",
  "dojo/domReady!"
], function(
  declare,
  _WidgetBase,
  Map,
  SceneView,
  FeatureLayer,
  WebTileLayer,
  QueryTask,
  Query,
  externalRenderers,
  DynamicLine
) {
  return declare([_WidgetBase], {
    view4hotTrafficLines: null, //视图
    featureLayerUrl_hotTrafficLines: null, //热点城市数据源 图层的url
    featureLayer4startCities: null, //起点城市标注
    featureLayer4endCities: null, //终点城市标注
    field4cityNameStart: null,
    field4cityNameEnd: null,
    field4sort: null, //排序 字段
    queryTask_hotTrafficLines: new QueryTask(),
    query_hotTrafficLines: new Query(),
    allFeatures_hotTrafficLines: null,

    constructor: function(option) {
      var _self = this;
      console.log("初始化hotTrafficLines模块(hotTrafficLines)");
      _self._init(option);
    },
    _init: function(option) {
      var _self = this;
      _self._initParams_hotTrafficLines(option);
      _self._createMap_hotTrafficLines(function(view) {
        if (view) {
          _self.view4hotTrafficLines = view;
          //添加热点城市图层 并过滤前10名城市
          _self._queryData_hotTrafficLines(function(allFeatures) {
            _self.allFeatures_hotTrafficLines = allFeatures;
            //处理数据并设置飞线
            _self._handleData_hotTrafficLines(
              _self.allFeatures_hotTrafficLines
            );
          });
        }
      });
    },
    _initParams_hotTrafficLines: function(option) {
      var _self = this;

      if (option.layerUrlHotTrafficLines) {
        //热门线路数据源要素图层
        _self.featureLayerUrl_hotTrafficLines = option.layerUrlHotTrafficLines;
      }
      if (option.layerUrlHotCities4hotLines) {
        //热门城市数据源要素图层
        _self.layerUrlHotCities4hotLines = option.layerUrlHotCities4hotLines;
      }
      if (option.field4cityNameStart) {
        _self.field4cityNameStart = option.field4cityNameStart;
      }
      if (option.field4cityNameEnd) {
        _self.field4cityNameEnd = option.field4cityNameEnd;
      }
      if (option.field4cityName_hotCitiesLayer) {
        _self.field4cityName_hotCitiesLayer =
          option.field4cityName_hotCitiesLayer;
      }
      if (option.field4num) {
        _self.field4num = option.field4num;
      }
      if (option.field4sort) {
        _self.field4sort = option.field4sort;
      }
    },
    _createMap_hotTrafficLines: function(callback) {
      //创建地图的代码
      var map = new Map({
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
            x: 12843728.88639686,
            y: 4603027.22995969,
            z: 111734.14457712136
          },
          heading: 38.47606387467193,
          tilt: 58.38788576393407,
          rotation: 321.5239361253281
        }
      });

      //创建视图
      var tiledLayer = new WebTileLayer({
        //捷泰 底图
        urlTemplate:
          "http://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{level}/{row}/{col}"
      });
      map.add(tiledLayer);

      if (callback) {
        //关键是这个.then 没有的话 view的一些属性还未加载全！ 比如 spatialReference属性，屏幕坐标转换地理坐标时会用到！
        // view.then(callback(view));
        view.when(callback(view));
      }
    },
    //查询数据
    _queryData_hotTrafficLines: function(callback) {
      var _self = this;

      var queryTask = new QueryTask({
        url: _self.featureLayerUrl_hotTrafficLines
      });
      var query = new Query();
      query.returnGeometry = true;
      query.outFields = ["*"];
      query.orderByFields = ["" + _self.field4sort + " desc"];
      query.where = "1=1";
      query.num = 10; //前10名

      // When resolved, returns features and graphics that satisfy the query.
      queryTask.execute(query).then(function(results) {
        console.log(
          "数据查询完毕,开始使用数据,数据总数：" + results.features.length
        );
        if (callback) {
          callback(results.features);
        }
      });
    },
    //处理，组织数据 经纬度坐标，echarts的是经纬度坐标，不用转屏幕坐标
    _handleData_hotTrafficLines: function(allFeatures) {
      var _self = this;
      var hotTrafficLines4threejs = [];
      var cityNamesStartTemp = [];
      var cityNamesStartArray = [];
      var cityNamesEndTemp = [];
      var cityNamesEndArray = [];
      var featureTemp,
        coordinateTemp,
        cityNameStartTemp,
        cityNameStartObjTemp,
        cityNameEndTemp,
        cityNameEndObjTemp,
        longitudeTemp,
        latitudeTemp;

      var length = allFeatures.length;
      //整理 起始点 数组、去重、符号化 start
      //去重
      for (var i = 0; i < length; i++) {
        featureTemp = allFeatures[i];
        hotTrafficLines4threejs.push(featureTemp);

        //起点城市
        cityNameStartTemp = featureTemp.attributes[_self.field4cityNameStart];
        if ($.inArray(cityNameStartTemp, cityNamesStartTemp) == -1) {
          cityNamesStartTemp.push(cityNameStartTemp);
          coordinateTemp = getCoordinate(cityNameStartTemp);
          longitudeTemp = coordinateTemp[0];
          latitudeTemp = coordinateTemp[1];
          cityNameStartObjTemp = {
            longitude: longitudeTemp,
            latitude: latitudeTemp,
            cityName: cityNameStartTemp
          };
          cityNamesStartArray.push(cityNameStartObjTemp);
        }
        //终点城市
        cityNameEndTemp = featureTemp.attributes[_self.field4cityNameEnd];
        if (
          $.inArray(cityNameEndTemp, cityNamesEndTemp) == -1 &&
          $.inArray(cityNameEndTemp, cityNamesStartTemp) == -1
        ) {
          cityNamesEndTemp.push(cityNameEndTemp);
          coordinateTemp = getCoordinate(cityNameEndTemp);
          longitudeTemp = coordinateTemp[0];
          latitudeTemp = coordinateTemp[1];
          cityNameEndObjTemp = {
            longitude: longitudeTemp,
            latitude: latitudeTemp,
            cityName: cityNameEndTemp
          };
          cityNamesEndArray.push(cityNameEndObjTemp);
        }
      }
      //渲染热门线路的起点城市和终点城市 start
      var featureLayer4hotCities = _self._createHotCitiesLayer4label(
        cityNamesStartArray,
        cityNamesEndArray
      );
      _self.view4hotTrafficLines.map.add(featureLayer4hotCities);
      //渲染热门线路的起点城市和终点城市 end
      //初始化 动态线模块 需要提前执行！
      var dynamicLineLayer = new DynamicLine(
        _self.view4hotTrafficLines,
        hotTrafficLines4threejs,
        cityNamesStartArray,
        cityNamesEndArray
      );
      //符号化 start
      //整理 起始点 数组、去重、符号化 end
      //使用three.js绘制动态线 start
      externalRenderers.add(_self.view4hotTrafficLines, dynamicLineLayer); //add时才出发 setup函数，否则不触发
      //使用three.js绘制动态线 end
    },
    _createHotCitiesLayer4label: function(
      cityNamesStartArray,
      cityNamesEndArray
    ) {
      var _self = this;
      //添加热门城市要素图层，用于标注城市
      var uniqueValueInfosArray = [];
      var uniqueValueInfoObj;
      for (var i = 0; i < cityNamesEndArray.length; i++) {
        uniqueValueInfoObj = {
          value: cityNamesEndArray[i].cityName,
          symbol: _self._getUniqueValueSymbol(
            "js/widgets/hotTrafficLines/image/end.png",
            "#40C2B4"
          )
        };
        uniqueValueInfosArray.push(uniqueValueInfoObj);
      }
      for (var j = 0; j < cityNamesStartArray.length; j++) {
        uniqueValueInfoObj = {
          value: cityNamesStartArray[j].cityName,
          symbol: _self._getUniqueValueSymbol(
            "js/widgets/hotTrafficLines/image/start.png",
            "#D13470"
          )
        };
        uniqueValueInfosArray.push(uniqueValueInfoObj);
      }
      var pointsRenderer4hotCities = {
        type: "unique-value", // autocasts as new UniqueValueRenderer()
        //field: "Type",
        field: _self.field4cityName_hotCitiesLayer, //这个很重要，要和图层里的字段对应正确。0319
        uniqueValueInfos: uniqueValueInfosArray
      };
      _self.featureLayer4hotCities = new FeatureLayer({
        url: _self.layerUrlHotCities4hotLines,
        title: "热门城市",
        renderer: pointsRenderer4hotCities,
        outFields: ["*"],
        // feature reduction is set to selection because our scene contains too many points and they overlap
        featureReduction: {
          type: "selection"
        },
        labelingInfo: [
          {
            labelExpressionInfo: {
              //value: "{Name}"
              //value: "{"+_self.field4cityName_hotCitiesLayer+"}"
              value: "{name_chn}"
            },
            symbol: {
              type: "label-3d", // autocasts as new LabelSymbol3D()
              symbolLayers: [
                {
                  type: "text", // autocasts as new TextSymbol3DLayer()
                  material: {
                    color: "#FDF5B9" //米黄色
                  },
                  // we set a halo on the font to make the labels more visible with any kind of background
                  halo: {
                    size: 1,
                    color: [50, 50, 50]
                  },
                  //size: 25
                  size: 35
                }
              ]
            }
          }
        ],
        labelsVisible: true
      });
      return _self.featureLayer4hotCities;
    },

    // Function that automatically creates the symbol for the points of interest
    _getUniqueValueSymbol: function(name, color) {
      return {
        type: "point-3d", // autocasts as new PointSymbol3D()
        symbolLayers: [
          {
            type: "icon", // autocasts as new IconSymbol3DLayer()
            resource: {
              //href: name
              href: null
            },
            //size: 20,
            size: 0,
            outline: {
              color: "white",
              size: 2
            }
          }
        ]
      };
    }
  });
});
function getCoordinate(name){
  var coordinate = [0,0];//经纬度   经度，维度  ||  x  y   默认值[0,0]
  if(name == '银川'){
      coordinate = [106.26300032070827,38.467998035581005];
  }else if(name == '北京'){
      //coordinate = [116.3,39.9];
      coordinate = [116.39151423860902,39.907006058502255];
  }else if(name == '太原'){
      coordinate = [112.55200241068282,37.89299692966463];
  }else if(name == '郑州'){
      coordinate = [113.6417852844634,34.757684944204875];
  }else if(name == '洛阳'){
      coordinate = [112.47116284021422,34.66184595602687];
  }else if(name == '成都'){
      coordinate = [104.06406289274892,30.574757681492578];
  }else if(name == '重庆'){
      coordinate = [107.87460997643747,30.05726318591476];
  }else if(name == '深圳'){
      coordinate = [114.02549999956513,22.613049999678577];
  }else if(name == '东莞'){
      coordinate = [113.73834105038019,23.04743645833684];
  }else if(name == '广州'){
      coordinate = [113.25898934638168,23.131711090624165];
  }else if(name == '上海'){
      coordinate = [121.41333891743494,31.08457965845781];
  }else if(name == '南京'){
      coordinate = [118.79137313031117,32.06052419379074];
  }else if(name == '苏州'){
      coordinate = [120.58207883853434,31.296648702571453];
  }else if(name == '杭州'){
      coordinate = [120.15043075464904,30.276118375444142];
  }else if(name == '天津'){
      coordinate = [117.32915087938233,39.299410162931025];
  }
  return coordinate;
}