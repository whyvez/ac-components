(function() {


// Create all modules and define dependencies to make sure they exist
// and are loaded in the correct order to satisfy dependency injection
// before all nested files are concatenated by Grunt

// Config
angular.module('acComponents.config', [])
    .value('acComponents.config', {
        debug: true
    })
    .constant('AC_API_ROOT_URL', '');

// Modules
angular.module('acComponents.directives', []);
angular.module('acComponents.filters', []);
angular.module('acComponents.services', []);
angular.module('acComponents',
    [
        'acComponents.config',
        'acComponents.directives',
        'acComponents.filters',
        'acComponents.services',
        'acComponents.templates',
        'ngSanitize'
    ]);

angular.module('acComponents.directives')
    .directive('acDrawer', function () {
        return {
            replace: true,
            transclude: true,
            templateUrl: 'drawer.html',
            link: function ($scope, el, attrs) {
                
            }
        };
    });
angular.module('acComponents.directives')
    .directive('acForecastMini', function () {
        return {
            templateUrl: 'forecast-mini.html',
            scope: {
                forecast: '=acForecast'
            },
            link: function ($scope, el, attrs) {
                el.addClass('ac-forecast-mini');
            }
        };
    });
angular.module('acComponents.directives')
    .directive('acLoadingIndicator', function () {
        return {
            templateUrl: 'loading-indicator.html',
            replace: true,
            link: function ($scope, el, attrs) {

            }
        };
    });
angular.module('acComponents.directives')
    .directive('acMapboxMap', ["$rootScope", "$window", "$timeout", "acBreakpoint", "MAPBOX_ACCESS_TOKEN", "MAPBOX_MAP_ID", function ($rootScope, $window, $timeout, acBreakpoint, MAPBOX_ACCESS_TOKEN, MAPBOX_MAP_ID) {
        return {
            template: '<div id="map"></div>',
            replace: true,
            scope: {
                mapboxAccessToken: '@',
                mapboxMapId: '@',
                sidebar: '@acMapSidebar',
                region: '=acRegion',
                regions: '=acRegions',
                obs: '=',
                filters: '='
            },
            link: function ($scope, el, attrs) {
                $scope.device = {};
                var layers = {
                    dangerIcons: L.featureGroup()
                };
                var styles = {
                    region: {
                        default: {
                            fillColor: 'transparent',
                            color: 'transparent'
                        },
                        selected: {
                            fillColor: '#489BDF'
                        }
                    }
                };

                L.mapbox.accessToken = MAPBOX_ACCESS_TOKEN;
                var map = L.mapbox.map(el[0].id, MAPBOX_MAP_ID, {attributionControl: false});

                var provinces = L.mapbox.geocoder('mapbox.places-province-v1');

                provinces.query('British-Columbia', function (err, results) {
                    var bcBounds = L.latLngBounds([results.bounds[1], results.bounds[0]], [results.bounds[3], results.bounds[2]]);
                    map.fitBounds(bcBounds);
                });

                L.control.locate({
                    locateOptions: {
                        maxZoom: 14
                    }
                }).addTo(map);

                acBreakpoint.setBreakpoints({
                    xs: 480,
                    sm: 600,
                    md: 1025,
                });

                $rootScope.$on('breakpoint', function (e, breakpoint) {
                    $scope.device.size = breakpoint;
                });

                // function refreshObsLayer() {
                //     if (map.hasLayer(layers.obs)){
                //         map.removeLayer(layers.obs);
                //     }

                //     layers.obs = L.geoJson($scope.obs, {
                //         pointToLayer: function (featureData, latlng) {
                //             var icons = {
                //                 avalanche: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'eye', markerColor: 'red'}),
                //                 incident: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'warning', markerColor: 'blue'}),
                //                 simple: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'warning', markerColor: 'orange'}),
                //                 snowpack: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'bar-chart', markerColor: 'darkred'}),
                //                 weather: L.AwesomeMarkers.icon({prefix: 'fa', icon: 'warning', markerColor: 'green'})
                //             };

                //             return L.marker(latlng, {icon: icons[featureData.properties.obsType]});
                //         },
                //         filter: function (featureData, layer) {
                //             return _.contains($scope.filters.obsType, featureData.properties.obsType);
                //         }
                //     }).addTo(map);
                // }
                
                function latLngToGeoJSON(latlng){
                    return {
                        type: 'Point',
                        coordinates: [latlng.lng, latlng.lat]
                    };
                }

                function getMapPadding(){
                    switch($scope.device.size) {
                        case 'xs':
                            return L.point([0, 0]);
                        case 'sm':
                            return L.point([350, 0]);
                        case 'md':
                        case 'lg':
                            return L.point([480, 0]);
                        default:
                            return L.point([0,0]);
                    }
                }

                function getMapOffset(){
                    return getMapPadding().divideBy(2);
                }

                // offfset can be negative i.e. [-240, 0]
                function offsetLatLng(latlng, offset){
                    var point = map.latLngToLayerPoint(latlng);
                    return map.layerPointToLatLng(point.subtract(offset));
                }

                function getMapCenter(){
                    var offset = getMapOffset();
                    return offsetLatLng(map.getCenter(), offset);
                }

                function getMapBounds() {
                    var latLngBounds = map.getBounds();
                    var min = map.latLngToLayerPoint(latLngBounds.getNorthWest());
                    var max = map.latLngToLayerPoint(latLngBounds.getSouthEast());
                    var padding = getMapPadding();

                    var bounds = L.bounds(min, max.subtract(padding));
                    var nw = map.layerPointToLatLng(bounds.max);
                    var se = map.layerPointToLatLng(bounds.min);

                    return L.latLngBounds(nw, se);
                }

                function getMapCenterBuffer(){
                    var mapCenter = getMapCenter();
                    var centerPoint = map.latLngToLayerPoint(mapCenter);
                    var buffer = L.bounds([centerPoint.x-50, centerPoint.y-50], [centerPoint.x+50, centerPoint.y+50]);

                    var nw = map.layerPointToLatLng(buffer.max);
                    var se = map.layerPointToLatLng(buffer.min);

                    return  L.latLngBounds(nw, se);
                }

                function setRegionFocus() {
                    if(map.getZoom() >= 8) {
                        var region;
                        var centerBuffer = getMapCenterBuffer();
                        var regions = layers.regions.getLayers();
                        var mapCenter = getMapCenter();
                        var mapBounds = getMapBounds();

                        var intersectsCenterBuffer = _.filter(regions, function (r) {
                            return centerBuffer.intersects(r.getBounds());
                        });

                        var withinMapBounds = _.filter(regions, function (r) {
                            return mapBounds.contains(r.getBounds());
                        });

                        var containsMapCenter = _.find(regions, function (r) {
                            return gju.pointInPolygon(latLngToGeoJSON(mapCenter), r.feature.geometry);
                        });

                        var centroidInMapBounds = _.filter(regions, function (r) {
                            return mapBounds.contains(r.feature.properties.centroid);
                        });

                        var intersectsCenterBufferAnWithinMapBounds = _.intersection(intersectsCenterBuffer, withinMapBounds);

                        if(intersectsCenterBufferAnWithinMapBounds.length === 1){
                            region = intersectsCenterBufferAnWithinMapBounds[0];
                        } else if(intersectsCenterBufferAnWithinMapBounds.length > 1) {
                            region = _.min(intersectsCenterBufferAnWithinMapBounds, function (r) {
                                return r.feature.properties.centroid.distanceTo(mapCenter);
                            });
                        } else if(centroidInMapBounds.length === 1){
                            region = centroidInMapBounds[0];
                        } else if(centroidInMapBounds.length > 1){
                            region = _.min(centroidInMapBounds, function (r) {
                                return r.feature.properties.centroid.distanceTo(mapCenter);
                            });
                        } else if (containsMapCenter) {
                            region = containsMapCenter;
                        }

                        $scope.$apply(function () {
                            $scope.region = region;
                        });
                    }
                }

                map.on('dragend', setRegionFocus);

                map.on('moveend', function () {
                    if(layers.dangerIcons) {
                        if(map.getZoom() <= 6 && map.hasLayer(layers.dangerIcons)) {
                            map.removeLayer(layers.dangerIcons);
                        } else if (map.getZoom() > 6 && !map.hasLayer(layers.dangerIcons)){
                            map.addLayer(layers.dangerIcons);
                        }
                    }
                });

                map.on('zoomend', function () {
                    var mapZoom = map.getZoom();
                    var opacity = 0.2;

                    setRegionFocus();

                    if(layers.currentRegion) {
                        if(mapZoom <= 9) {
                            styles.region.selected.fillOpacity = opacity;
                            layers.currentRegion.setStyle(styles.region.selected);
                        } else if(mapZoom > 9 && mapZoom < 13){
                            switch(mapZoom){
                                case 10:
                                    opacity = 0.15;
                                    break;
                                case 11:
                                    opacity = 0.10;
                                    break;
                                case 12:
                                    opacity = 0.05;
                                    break;
                            }

                            styles.region.selected.fillOpacity = opacity;
                            layers.currentRegion.setStyle(styles.region.selected);
                        } else {
                            layers.currentRegion.setStyle(styles.region.default);
                        }
                    }

                    // if(layers.obs && mapZoom > 7 && !map.hasLayer(layers.obs)) {
                    //     $scope.filters.obsType = ['avalanche', 'incident', 'snowpack', 'simple', 'weather'];
                    //     $scope.filters.obsPeriod = ['7:days'];
                    //     map.addLayer(layers.obs);
                    // } else if(layers.obs && mapZoom <= 7 && map.hasLayer(layers.obs)){
                    //     $scope.filters.obsType = [];
                    //     map.removeLayer(layers.obs);
                    // }

                });

                $scope.$watch('region', function (region) {
                    if(region && layers.regions) {
                        layers.regions.eachLayer(function (layer) {
                            var style = (layer === region ? styles.region.selected : styles.region.default);
                            layer.setStyle(style);
                            layers.currentRegion = layer;
                        });
                    }
                });

                $scope.$watch('regions', function (regions) {
                    if(regions && regions.features) {

                        layers.regions = L.geoJson($scope.regions, {
                            style: function(feature) {
                                return styles.region.default;
                            },
                            onEachFeature: function (featureData, layer) {
                                layer.bindLabel(featureData.properties.name, {noHide: true});

                                function showRegion(evt){
                                    if(map.getZoom() < 9) {
                                        map.fitBounds(layer.getBounds());
                                    } else {
                                        map.panTo(evt.latlng);
                                    }

                                    $scope.$apply(function () {
                                        $scope.region = layer;
                                    });
                                }

                                layer.on('click', showRegion);

                                if(featureData.properties.centroid) {
                                    var centroid = L.latLng(featureData.properties.centroid[1], featureData.properties.centroid[0]);

                                    L.marker(centroid, {
                                        icon: L.icon({
                                            iconUrl: 'http://localhost:9000'+featureData.properties.dangerIconUrl,
                                            iconSize: [80, 80]
                                        })
                                    }).on('click', showRegion).addTo(layers.dangerIcons);
                                }

                            }
                        }).addTo(map);
                    }
                });

                // $scope.$watch('obs', function (obs) {
                //     if(obs && obs.features) {
                //         refreshObsLayer();
                //     }
                // });

                // $scope.$watchCollection('filters.obsType', refreshObsLayer);
            }
        };
    }]);
angular.module('acComponents.filters')
    .filter('acNormalizeForecastTitle', function () {
        return function (item) {
            if (item) {
                return item.replace(/^Avalanche (Forecast|Bulletin) - /g, '');
            }
        };
    });
angular.module('acComponents.services')
    .factory('acBreakpoint', ["$rootScope", "$timeout", "$window", function ($rootScope, $timeout, $window) {
        return {
            setBreakpoints: function (breakpoints) { // {xs: 400, sm: 600, md: 1025}
                var breakpoint;

                function broadcastBreakpoint() {
                    var bp;
                    var width = $($window).width();

                    if(width < breakpoints.xs) {
                        bp = 'xs';
                    } else if(width >= breakpoints.xs && width < breakpoints.sm) {
                        bp = 'sm';
                    } else if(width >= breakpoints.sm && width < breakpoints.md) {
                        bp = 'md';
                    } else {
                        bp = 'lg';
                    }

                    if(!breakpoint || bp !== breakpoint) {
                        breakpoint = bp;
                        $timeout(function () {
                            $rootScope.$broadcast('breakpoint', breakpoint);
                        }, 0);
                    }
                }

                broadcastBreakpoint();
                angular.element($window).bind('resize', broadcastBreakpoint);
            }
        };
    }]);
angular.module('acComponents.services')
    .factory('acForecast', ["$http", "$q", "acImageCache", "AC_API_ROOT_URL", function ($http, $q, acImageCache, AC_API_ROOT_URL) {
        var forecasts;
        var apiUrl = AC_API_ROOT_URL; // todo: move to constants

        function cacheDangerIcons(){
            var dangerIcons = _.map(forecasts.features, function (f) {
                return apiUrl + f.properties.dangerIconUrl;
            });

            acImageCache.cache(dangerIcons);
        }

        return {
            fetch: function () {
                var deferred = $q.defer();

                if(forecasts) {
                    deferred.resolve(forecasts);
                } else {
                    $http.get(apiUrl + '/api/forecasts').then(function (res) {
                        forecasts = res.data;
                        cacheDangerIcons();
                        deferred.resolve(forecasts);
                    });
                }

                return deferred.promise;
            },
            getOne: function (region) {
                return $q.when(this.fetch()).then(function () {
                    region = _.find(forecasts.features, {id: region});

                    return $http.get(apiUrl + region.properties.forecastUrl).then(function (res) {
                        return res.data;
                    });
                });
            }
        };
    }]);
angular.module('acComponents.services')
    .factory('acImageCache', ["$http", function($http) {
        return {
            cache: function (images) {
                images.forEach(function (i) {
                    $http.get(i);
                });
            }
        };
    }]);
angular.module('acComponents.services')
    .factory('acObservation', ["$http", function ($http) {
        return {
            byPeriod: function (period) {
                var opt = {params: {period: period}};

                return $http.get('api/observations', opt).then(function (res) {
                    return res.data;
                });
            }
        };
    }]);
angular.module("acComponents.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("drawer.html","<div class=\"ac-drawer\"><a ng-click=\"drawer.visible = false\" class=\"ac-drawer-close visible-xs\"><i class=\"fa fa-close fa-lg\"></i></a><div class=\"ac-drawer-tools\"><ul><li ng-click=\"drawer.visible = !drawer.visible\"><i class=\"fa fa-file-text-o fa-fw fa-2x fa-inverse ac-middle\"></i></li></ul></div><div ng-transclude=\"ng-transclude\" class=\"ac-drawer-body\"></div></div>");
$templateCache.put("forecast-mini.html","<div class=\"panel\"><div ng-show=\"forecast.externalUrl\" class=\"panel-body\"><div class=\"row\"><div class=\"col-xs-12\"><h3 class=\"ac-forecast-region\">{{ forecast.name }}</h3></div></div><div class=\"row\"><div class=\"col-xs-12\"><p>The avalanche forecast for this region is produced by one of our partner agencies. \nThe link below will take you to the forecast page on the partner agency\'s own website.</p><a ng-href=\"{{forecast.externalUrl}}\" target=\"_blank\"><i class=\"fa fa-external-link\"></i>  Open partner forecast in new window.</a></div></div></div><div ng-hide=\"forecast.externalUrl\" class=\"panel-body ac-forecast-mini-body\"><div class=\"row\"><div class=\"col-xs-12\"><h4 class=\"ac-forecast-region\">{{ forecast.bulletinTitle | acNormalizeForecastTitle }}</h4></div></div><div class=\"row ac-forecast-dates\"><div class=\"col-md-6\"><dl><dd class=\"small\"><strong class=\"ac-text-primary\">DATE ISSUED </strong></dd><dt class=\"small\"><span class=\"ac-text-default\">{{ forecast.dateIssued | date:\'EEEE MMMM d, y h:mm a\' | uppercase }}</span></dt></dl></div><div class=\"col-md-6\"><dl><dd class=\"small\"><strong class=\"ac-text-primary\">VALID UNTIL</strong></dd><dt class=\"small\"><span class=\"ac-text-default\">{{ forecast.validUntil | date:\'EEEE MMMM d, y h:mm a\' | uppercase }}</span></dt></dl></div></div><div class=\"row\"><div class=\"col-xs-12\"><p class=\"ac-forecast-highlights\"><strong ng-bind-html=\"forecast.highlights\"></strong></p></div></div><div class=\"row\"><div class=\"col-xs-12\"><ul role=\"tablist\" class=\"nav nav-pills\"><li class=\"active\"><a href=\"\" role=\"tab\" data-target=\"#forecast\" data-toggle=\"tab\">Forecast</a></li><li><a href=\"\" role=\"tab\" data-target=\"#problems\" data-toggle=\"tab\">Problems</a></li><li><a href=\"\" role=\"tab\" data-target=\"#details\" data-toggle=\"tab\">Details</a></li></ul><div class=\"tab-content\"><div id=\"forecast\" class=\"tab-pane active\"><div class=\"row\"><div class=\"col-xs-12\"><div class=\"panel panel-primary\"><div class=\"panel-heading\">{{ forecast.dangerRatings[0].date | date:\'EEEE\' }}</div><div class=\"panel-body ac-forecast-nowcast\"><img ng-show=\"forecast.region\" ng-src=\"{{forecast.region &amp;&amp; \'http://localhost:9000/api/forecasts/\' + forecast.region  + \'/nowcast.svg\' || \'\'}}\" class=\"ac-nowcast\"/></div><table class=\"table table-condensed ac-forecast-days\"><thead class=\"ac-thead-dark\"><tr><th></th><th>{{ forecast.dangerRatings[1].date | date:\'EEEE\' }}</th><th>{{ forecast.dangerRatings[2].date | date:\'EEEE\' }}</th></tr></thead><tbody><tr><td class=\"ac-veg-zone--alp\"> <strong>Alpine</strong></td><td class=\"ac-danger-rating--{{ forecast.dangerRatings[1].dangerRating.alp.split(\':\')[1].toLowerCase()}}\"> <strong>{{ forecast.dangerRatings[1].dangerRating.alp.replace(\':\', \' \') }}</strong></td><td class=\"ac-danger-rating--{{ forecast.dangerRatings[2].dangerRating.alp.split(\':\')[1].toLowerCase()}}\"> <strong>{{ forecast.dangerRatings[2].dangerRating.alp.replace(\':\', \' \') }}</strong></td></tr><tr><td class=\"ac-veg-zone--tln\"> <strong>Treeline</strong></td><td class=\"ac-danger-rating--{{ forecast.dangerRatings[1].dangerRating.tln.split(\':\')[1].toLowerCase()}}\"> <strong>{{ forecast.dangerRatings[1].dangerRating.tln.replace(\':\', \' \') }}</strong></td><td class=\"ac-danger-rating--{{ forecast.dangerRatings[2].dangerRating.tln.split(\':\')[1].toLowerCase()}}\"> <strong>{{ forecast.dangerRatings[2].dangerRating.tln.replace(\':\', \' \') }}</strong></td></tr><tr><td class=\"ac-veg-zone--btl\"> <strong>Bellow Treeline</strong></td><td class=\"ac-danger-rating--{{ forecast.dangerRatings[1].dangerRating.btl.split(\':\')[1].toLowerCase()}}\"> <strong>{{ forecast.dangerRatings[1].dangerRating.btl.replace(\':\', \' \') }}</strong></td><td class=\"ac-danger-rating--{{ forecast.dangerRatings[2].dangerRating.btl.split(\':\')[1].toLowerCase()}}\"> <strong>{{ forecast.dangerRatings[2].dangerRating.btl.replace(\':\', \' \') }}</strong></td></tr><tr><td><strong>Confidence:</strong></td><td colspan=\"2\"><span class=\"ac-text-default\">{{ forecast.confidence }}</span></td></tr></tbody></table></div></div></div></div><div id=\"problems\" class=\"tab-pane\"><div id=\"problemsAccordion\" class=\"panel-group\"><div ng-repeat=\"problem in forecast.problems\" class=\"panel panel-primary\"><div class=\"panel-heading\"><h4 class=\"panel-title\"><a href=\"\" data-target=\"#problem{{$index}}\" data-toggle=\"collapse\" data-parent=\"#problemsAccordion\">{{ problem.type }}<i class=\"fa fa-fw fa-level-down pull-right\"></i><small class=\"pull-right\">click to expand</small></a></h4></div><div id=\"problem{{$index}}\" class=\"panel-collapse collapse\"><div class=\"panel-body\"><div class=\"row\"><div class=\"col-md-6\"><div class=\"panel panel-default\"><div class=\"panel-heading\"><strong class=\"small\">What Elevations?</strong></div><div class=\"panel-body ac-problem-icon ac-problem-icon--elevations\"><img ng-src=\"{{problem.icons.elevations}}\" class=\"center-block\"/></div></div></div><div class=\"col-md-6\"><div class=\"panel panel-default\"><div class=\"panel-heading\"><strong class=\"small\">What Aspects?</strong></div><div class=\"panel-body ac-problem-icon ac-problem-icon--aspects\"><img ng-src=\"{{problem.icons.aspects}}\" class=\"center-block\"/></div></div></div></div><div class=\"row\"><div class=\"col-md-6\"><div class=\"panel panel-default\"><div class=\"panel-heading\"><strong class=\"small\">Chances of Avalanches?</strong></div><div class=\"panel-body ac-problem-icon ac-problem-icon--likelihood\"><img ng-src=\"{{problem.icons.likelihood}}\" class=\"center-block\"/></div></div></div><div class=\"col-md-6\"><div class=\"panel panel-default\"><div class=\"panel-heading\"><strong class=\"small\">Expected Size?</strong></div><div class=\"panel-body ac-problem-icon ac-problem-icon--expected-size\"><img ng-src=\"{{problem.icons.expectedSize}}\" class=\"center-block\"/></div></div></div></div><div class=\"row\"><div class=\"col-md-12\"><p ng-bind-html=\"problem.comment\" class=\"ac-problem narative\"></p><div class=\"panel panel-default ac-problem-travel-advice\"><div class=\"panel-heading\"><strong class=\"small\">Travel and Terrain Advice</strong></div><div class=\"panel-body\"><p ng-bind-html=\"problem.travelAndTerrainAdvice\"></p></div></div></div></div></div></div></div></div></div><div id=\"details\" class=\"tab-pane\"><div id=\"detailsAccordion\" class=\"panel-group\"><div class=\"panel panel-primary\"><div class=\"panel-heading\"><h4 class=\"panel-title\"><a href=\"\" data-target=\"#avalancheSummary\" data-toggle=\"collapse\" data-parent=\"#detailsAccordion\">Avalanche Summary<i class=\"fa fa-fw fa-level-down fa-lg pull-right\"></i><small class=\"pull-right\">click to expand</small></a></h4></div><div id=\"avalancheSummary\" class=\"panel-collapse collapse\"><div ng-bind-html=\"forecast.avalancheSummary\" class=\"panel-body\"></div></div></div><div class=\"panel panel-primary\"><div class=\"panel-heading\"><h4 class=\"panel-title\"><a href=\"\" data-target=\"#snowpackSummary\" data-toggle=\"collapse\" data-parent=\"#detailsAccordion\">Snowpack Summary<i class=\"fa fa-fw fa-level-down fa-lg pull-right\"></i><small class=\"pull-right\">click to expand</small></a></h4></div><div id=\"snowpackSummary\" class=\"panel-collapse collapse\"><div ng-bind-html=\"forecast.snowpackSummary\" class=\"panel-body\"></div></div></div><div class=\"panel panel-primary\"><div class=\"panel-heading\"><h4 class=\"panel-title\"><a href=\"\" data-target=\"#weatherForecast\" data-toggle=\"collapse\" data-parent=\"#detailsAccordion\">Weather Forecast<i class=\"fa fa-fw fa-level-down fa-lg pull-right\"></i><small class=\"pull-right\">click to expand</small></a></h4></div><div id=\"weatherForecast\" class=\"panel-collapse collapse\"><div ng-bind-html=\"forecast.weatherForecast\" class=\"panel-body\"></div></div></div></div></div></div></div></div></div></div>");
$templateCache.put("loading-indicator.html","<div class=\"ac-loading-indicator\"><div class=\"rect1\"></div><div class=\"rect2\"></div><div class=\"rect3\"></div><div class=\"rect4\"></div><div class=\"rect5\"></div></div>");}]);
}());