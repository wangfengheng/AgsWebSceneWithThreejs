var pathRegex = new RegExp(/\/[^\/]+$/);
var locationPath = location.pathname.replace(pathRegex, '');
var rootPath = location.href.slice(0, location.href.lastIndexOf('/'));
//dojo config
var dojoConfig = {
    parseOnLad: true,
    packages: [
        {
            name: "widgets",
            location: locationPath + '/js/widgets'
        },
        {
            name: "toolkit",
            location: locationPath + '/js/toolkit'
        }
    ]
};