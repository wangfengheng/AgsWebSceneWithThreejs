require([
    "widgets/hotCities/hotCities",
    "dojo/domReady!"
], function (HotCities) {
    try {
        var featureLayerUrl_hotCities = "http://esrichina3d.arcgisonline.cn/arcgis/rest/services/Hosted/hotCitiesAndTrafficLines/FeatureServer/0";
        var option = {
            layerUrlHotCities:featureLayerUrl_hotCities,//热点城市数据源，图层的url
            field4cityName:"name_chn",//城市的名称 字段
            field4num:"d1001",//客流量 字段
            field4sort:"d1001"//排序 字段
        };
        var hotCities = new HotCities(option);
    } catch (ex) {
        alert(ex.message);
    }
});
