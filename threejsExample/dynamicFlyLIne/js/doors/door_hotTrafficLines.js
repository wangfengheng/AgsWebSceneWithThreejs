require([
    "widgets/hotTrafficLines/hotTrafficLines",
    "dojo/domReady!"
], function (HotTrafficLines) {
    try {
        var featureLayerUrl_hotTrafficLines = "http://esrichina3d.arcgisonline.cn/arcgis/rest/services/Hosted/hotCitiesAndTrafficLines/FeatureServer/2";
        var featureLayerUrl_hotCities4hotLines = "http://esrichina3d.arcgisonline.cn/arcgis/rest/services/Hosted/hotCitiesAndTrafficLines/FeatureServer/0";
        var option = {
            layerUrlHotTrafficLines:featureLayerUrl_hotTrafficLines,//热门线路数据源，图层的url
            layerUrlHotCities4hotLines:featureLayerUrl_hotCities4hotLines,//热门城市数据源，图层的url 用于渲染起点城市和终点城市
            field4cityNameStart:"start",//起点城市的名称 字段
            field4cityNameEnd:"to_",//终点城市的名称 字段
            field4cityName_hotCitiesLayer:"name_chn",//热门城市图层中城市名称 字段
            field4num:"rank",//名次 字段
            field4sort:"rank"//排序 字段
        };
        var hotTrafficLines = new HotTrafficLines(option);
    } catch (ex) {
        alert(ex.message);
    }
});
