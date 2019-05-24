define([
    "esri/core/declare",
    "esri/geometry/SpatialReference",
    "esri/views/3d/externalRenderers"
], function (declare,
             SpatialReference,
             externalRenderers) {
    var THREE = window.THREE;

    return declare({

        renderer: null,     // three.js renderer
        camera: null,       // three.js camera
        scene: null,        // three.js scene
        ambient: null,      // three.js ambient light source
        sun: null,          // three.js sun light source


        constructor: function (view, featuresArray4draw) {//用于传入参数用的函数，函数名称constructor固定不可更改
            this.view = view;
            this.featuresArray4draw = featuresArray4draw;
            console.log("geometry3Dpie.js模块");
            this.refresh = Date.now();
        },
        setup: function (context) {//externalRenderers必须要存在的函数
            // initialize the three.js renderer
            //////////////////////////////////////////////////////////////////////////////////////
            this.renderer = new THREE.WebGLRenderer({
                context: context.gl,
                premultipliedAlpha: false
            });
            this.renderer.setPixelRatio(window.devicePixelRatio);
            this.renderer.setSize(context.camera.fullWidth, context.camera.fullHeight);

            // prevent three.js from clearing the buffers provided by the ArcGIS JS API.
            //autoClearDepth和autoClearColor同为true时就可以把地表去掉


            //this.renderer.autoClearDepth = true;//正常为false，
            //this.renderer.autoClearStencil = false;
            //this.renderer.autoClearColor = true;//正常为false


            this.renderer.autoClearDepth = false;//正常为false，
            this.renderer.autoClearStencil = false;
            this.renderer.autoClearColor = false;//正常为false
//
            // The ArcGIS JS API renders to custom offscreen buffers, and not to the default framebuffers.
            // We have to inject this bit of code into the three.js runtime in order for it to bind those
            // buffers instead of the default ones.
            var originalSetRenderTarget = this.renderer.setRenderTarget.bind(this.renderer);
            this.renderer.setRenderTarget = function (target) {
                originalSetRenderTarget(target);
                if (target == null) {
                    context.bindRenderTarget();
                }
            }

            // setup the three.js scene
            ///////////////////////////////////////////////////////////////////////////////////////
            this.scene = new THREE.Scene();
            //this.scene.add(new THREE.AxesHelper(9000000));//添加辅助坐标轴

            this._createCamera(context);

            this._createLights();

            this._createObjects();

            context.resetWebGLState();
        },
        render: function (context) {//externalRenderers必须要存在的函数
            this._updateCamera(context);
            this._updateLights(context)
            this._updateObjects(context)

            // draw the scene
            /////////////////////////////////////////////////////////////////////////////////////////////////////
            this.renderer.state.reset();//.resetGLState()已被弃用，替换为.state.reset()
            this.renderer.render(this.scene, this.camera);
            // as we want to smoothly animate the ISS movement, immediately request a re-render
            externalRenderers.requestRender(this.view);

            // cleanup
            context.resetWebGLState();

        },
        _createCamera: function (context) {
            // 设置相机 the camera
            var cam = context.camera;
            this.camera = new THREE.PerspectiveCamera(cam.fovY, cam.aspect, cam.near, cam.far);

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
            //--------------------
//          //点光源
//          this.pointLight=new THREE.PointLight();
//          this.pointLight.position.set(0,0,9000000);
//          this.scene.add(this.pointLight);
            //--------------------
        },
        //创建三维物体
        _createObjects: function () {

            var _self = this;

            //var colorsArray = [0xEE0000,0x6B8E23,0x3A5FCD];//红 绿 蓝
            var colorsArray = [];
            var colorTemp = null;
            var colorsArrayLight = [];
            colorsArrayLight.push('#37A2DA');//深蓝
            colorsArrayLight.push('#32C5E9');//淡蓝
            colorsArrayLight.push('#67E0E3');//淡淡蓝
            colorsArrayLight.push('#9FE6B8');//绿
            colorsArrayLight.push('#FFDB5C');//黄
            colorsArrayLight.push('#FF9F7F');//二红
            colorsArrayLight.push('#FB7293');//大红
            colorsArrayLight.push('#E062AE');//紫
            colorsArrayLight.push('#E690D1');//淡紫
            colorsArrayLight.push('#E7BCF3');//淡淡紫
            colorsArrayLight.push('#8378EA');//紫蓝
            colorsArrayLight.push('#9D96F5');//淡紫蓝
            colorsArrayLight.push('#96BFFF');//淡淡紫蓝
            for(var c=0;c<colorsArrayLight.length;c++){
                colorTemp = colorsArrayLight[c].replace(/#/,"0x");
                colorsArray.push(colorTemp*1);//不能是字符串，必须是数值型
            }
            var featuresArray4draw = this.featuresArray4draw;
            var feature4draw = null;
            var pieData = null;
            var pieDataValueSum = null;
            var sectorData = null;
            var sectorObj = null;
            var transform = null;
            var geometry4cylinder = null;
            var sectorStart = 0;
            var sectorRate = 0;
            var sectorLength = Math.PI * 2;
            var geoData = null;
            var material4cylinder = null;
            var mesh4cylinder = null;
            for (var i = 0; i < featuresArray4draw.length; i++) {
                feature4draw = featuresArray4draw[i];
                pieData = feature4draw.pieData;

                //CylinderGeometry(radiusTop, radiusBottom, height, radiusSegments, heightSegments, openEnded, thetaStart, thetaLength)
                //radiusTop — Radius of the cylinder at the top. Default is 1.
                //radiusBottom — Radius of the cylinder at the bottom. Default is 1.
                //height — Height of the cylinder. Default is 1.
                //radiusSegments — Number of segmented faces around the circumference of the cylinder. Default is 8
                //heightSegments — Number of rows of faces along the height of the cylinder. Default is 1.
                //openEnded — A Boolean indicating whether the ends of the cylinder are open or capped. Default is false, meaning capped.
                //    thetaStart — Start angle for first segment, default = 0 (three o'clock position).
                //thetaLength — The central angle, often called theta, of the circular sector. The default is 2*Pi, which makes for a complete cylinder.

                //先计算饼图数据总和 start
                pieDataValueSum = 0;
                for(var j=0;j<pieData.length;j++){
                    sectorObj = pieData[j];
                    pieDataValueSum += sectorObj.value;
                }
                //先计算饼图数据总和 end
                for(var k=0;k<pieData.length;k++){
                    sectorObj = pieData[k];
                    //该饼图对象所占的比例
                    sectorRate = sectorObj.value/pieDataValueSum;
                    //设置 thetaStart
                    if(k == 0){
                        sectorStart = 0;
                    }else{
                        sectorStart = _self._getThetaStart4sector(k,pieData,pieDataValueSum);
                    }
                    sectorLength = sectorRate * Math.PI * 2;
                    geometry4cylinder = new THREE.CylinderBufferGeometry(feature4draw.geometryRadius, feature4draw.geometryRadius,
                        feature4draw.geometryHeight, 32,32,false,sectorStart,sectorLength);//圆柱
                    if(k<(colorsArray.length)){
                        colorTemp = colorsArray[k];
                    }else{
                        colorTemp = colorsArray[(k-colorsArray.length+1)];
                    }
                    material4cylinder = new THREE.MeshLambertMaterial({color: colorTemp});
                    mesh4cylinder = new THREE.Mesh(geometry4cylinder, material4cylinder);
                    geoData = [];
                    geoData.push(feature4draw.longitude);
                    geoData.push(feature4draw.latitude);
                    geoData.push(0);
                    transform = new THREE.Matrix4();
                    transform.fromArray(externalRenderers.renderCoordinateTransformAt(this.view, geoData, SpatialReference.WGS84, new Array(16)));
                    mesh4cylinder.position.set(transform.elements[12], transform.elements[13], transform.elements[14]);
                    mesh4cylinder.rotation.z = -Math.asin(Math.cos((geoData[1] / 180) * Math.PI) * Math.cos((geoData[0] / 180) * Math.PI));
                    mesh4cylinder.rotation.x = Math.atan(Math.tan((geoData[1] / 180) * Math.PI) / Math.sin((geoData[0] / 180) * Math.PI));
                    this.scene.add(mesh4cylinder);
                }

            }
        },
        //计算 thetaStart 值
        _getThetaStart4sector:function (index,pieData,pieDataValueSum){
            var rate = 0;
            var length = index+1;
            for(var i=1;i<length;i++){
                rate += pieData[i].value/pieDataValueSum;
            }
            return (1-rate) * Math.PI * 2;//正方向是 逆时针， 所以得 用 2*Math.PI 减去该 thetaStart值
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
            this.sun.color = new THREE.Color(light.diffuse.color[0], light.diffuse.color[1], light.diffuse.color[2]);
            this.ambient.intensity = light.ambient.intensity;
            this.ambient.color = new THREE.Color(light.ambient.color[0], light.ambient.color[1], light.ambient.color[2]);

        },
        //更新三维物体
        _updateObjects: function (context) {
            //更新三维物体逻辑

        },
        //更新相机
        _updateCamera: function (context) {
            var cam = context.camera;
            this.camera.position.set(cam.eye[0], cam.eye[1], cam.eye[2]);
            this.camera.up.set(cam.up[0], cam.up[1], cam.up[2]);
            this.camera.lookAt(new THREE.Vector3(cam.center[0], cam.center[1], cam.center[2]));
            // Projection matrix can be copied directly
            this.camera.projectionMatrix.fromArray(cam.projectionMatrix);
        }
    })
})