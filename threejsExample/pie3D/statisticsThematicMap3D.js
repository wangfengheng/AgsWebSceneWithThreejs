define([
    "dojo/_base/declare",
    "dijit/_WidgetBase",
    "esri/WebScene",
    "esri/views/SceneView",
    "esri/layers/WebTileLayer",
    "esri/tasks/QueryTask",
    "esri/tasks/support/Query",
    "esri/views/3d/externalRenderers",
    "statisticsTM_externalRenderers/geometry3Dpie.js",
    "dojo/domReady!"
], function (declare, _WidgetBase, WebScene, SceneView, WebTileLayer,
    QueryTask, Query, externalRenderers, Geometry3Dpie) {
        return declare([_WidgetBase], {
            view4stm3d: null,//视图
            //匹配 饼图数据 的关键字段 ，同时也是 封装 饼图数据时的关键字段，封装饼图数据的函数名： _getPieDataArray
            field4MatchPieData: "city_name",
            geometryHeight4pie: 30000,//饼图的 高度，目前是 30000
            geometryRadius4pie: 40000,//饼图的 半径，目前是 40000
            geometry3DpieLayer: null,
            pieDataArray: null,

            constructor: function () {
                var _self = this;
                console.log("初始化statisticsThematicMap3D模块");
                _self._init();
            },
            _init: function () {
                var _self = this;
                _self._createMap_stm3d(function (view) {
                    if (view) {
                        _self.view4stm3d = view;
                        _self._initPieRenderer_stm3d(_self.view4stm3d);//初始化渲染_饼状图
                    }
                });
            },
            _createMap_stm3d: function (callback) {
                //创建地图的代码
                var map = new WebScene({});
                // 添加底图
                var basemapLayer = new WebTileLayer({
                    //捷泰 底图
                    urlTemplate: "http://map.geoq.cn/arcgis/rest/services/ChinaOnlineStreetPurplishBlue/MapServer/tile/{level}/{row}/{col}"
                });
                map.add(basemapLayer);
                //创建视图
                var view = new SceneView({
                    container: "viewDiv",  // 指定一个DOM节点，用id来匹配
                    map: map, // 将上一步创建的地图放到视图容器中
                    center:[112.144017,34.18802],
                    zoom:6
                });
                if (callback) {
                    //关键是这个.then 没有的话 view的一些属性还未加载全！ 比如 spatialReference属性，屏幕坐标转换地理坐标时会用到！
                    //view.when(callback(view));
                    view.when(function () {
                        callback(view);
                    });
                }
            },
            //查询数据
            _queryData_stm3d: function (layerUrl, callback) {
                var _self = this;
                var queryTask = new QueryTask({
                    url: layerUrl
                });
                var query = new Query();
                query.returnGeometry = true;
                query.outFields = ["*"];
                query.where = "1=1";
                // When resolved, returns features and graphics that satisfy the query.
                queryTask.execute(query).then(function (results) {
                    console.log("数据查询完毕,开始使用数据,数据总数：" + results.features.length);
                    if (callback) {
                        callback(results.features);
                    }
                });
            },
            //处理，组织数据 经纬度坐标，echarts的是经纬度坐标，不用转屏幕坐标
            _handleData4pie_stm3d: function (allFeatures, callback) {
                var _self = this;
                var features4stm3d = [];
                var featureObj = null;
                var featureTemp;
                var pieData = null;
                var length = allFeatures.length;
                for (var i = 0; i < length; i++) {
                    featureTemp = allFeatures[i];
                    pieData = _self._getPieDataByKeyWord(featureTemp.attributes[_self.field4MatchPieData], _self.pieDataArray);
                    featureObj = {
                        longitude: featureTemp.geometry.longitude,
                        latitude: featureTemp.geometry.latitude,
                        geometryHeight: _self.geometryHeight4pie,
                        geometryRadius: _self.geometryRadius4pie,
                        pieData: pieData//饼图的数据  格式为数组，每个元素都是一个Object对象 ，比如 该城市的 第一产业，第二产业，第三产业的 GDP数值
                    };
                    features4stm3d.push(featureObj);
                }
                if (callback) {
                    callback(features4stm3d);//正式
                }
            },
            //获取饼状图所需要的数据
            _getPieDataArray: function (allFeatures) {
                var pieDataArray = [];
                var featureTemp = null;
                var pieDataObj = null;
                var pieData = null;
                var pieDataSectionObj = null;
                var count4pieDataSection = 5;//饼图数据结构的划分数目，比如  5， 结构可能是： 浏览器1，浏览器2，浏览器3，浏览器4，浏览器5
                for (var i = 0; i < allFeatures.length; i++) {
                    featureTemp = allFeatures[i];
                    pieDataObj = {};
                    pieDataObj["key"] = featureTemp.attributes["city_name"];
                    pieData = [];
                    for (var j = 0; j < count4pieDataSection; j++) {
                        pieDataSectionObj = {};
                        pieDataSectionObj["value"] = getRandom4range_stm3d(2000, 20000) * 0.01;
                        pieDataSectionObj["name"] = "标签" + (j + 1);
                        pieData.push(pieDataSectionObj);
                    }
                    pieDataObj["value"] = pieData;
                    pieDataArray.push(pieDataObj);
                }
                return pieDataArray;
            },
            _getPieDataByKeyWord: function (keyWord, pieDataArray) {
                var pieData = [{
                    value: 50,
                    name: 'test1'
                }, {
                    value: 10,
                    name: 'test2'
                }];
                var pieDataObjTemp = null;

                for (var i = 0; i < pieDataArray.length; i++) {
                    pieDataObjTemp = pieDataArray[i];
                    if (pieDataObjTemp["key"] == keyWord) {
                        pieData = pieDataObjTemp["value"];
                        return pieData;
                    }
                }
            },
            _initPieRenderer_stm3d: function (view) {
                var _self = this;
                //开始初始化渲染
                var layerUrl = 'http://esrichina3d.arcgisonline.cn/arcgis/rest/services/Hosted/chinacity4southernPower/FeatureServer/0';
                _self._queryData_stm3d(layerUrl, function (allFeatures) {
                    //先获取饼状图所需要的数据
                    _self.pieDataArray = _self._getPieDataArray(allFeatures);
                    //再进行数据封装及渲染
                    _self._handleData4pie_stm3d(allFeatures, function (features4stm3d) {
                        //使用three.js绘制三维饼图 start
                        _self.geometry3DpieLayer = new Geometry3Dpie(view, features4stm3d);
                        externalRenderers.add(view, _self.geometry3DpieLayer);//add时才出发 setup函数，否则不触发
                        //使用three.js绘制三维饼图 end
                    })
                });
            }

        })
    });
//获得指定范围的随机数
function getRandom4range_stm3d(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}