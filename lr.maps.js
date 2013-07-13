(function() {
    "use strict";

    lr.maps = {

        Map: function(mapDiv, options) {
            var map = new google.maps.Map(mapDiv, options);
            var mapBounds = new google.maps.LatLngBounds();
            var latLngPosition = null;

            this.getMap = function() {
                return map;
            };

            this.getDiv = function() {
                return map.getDiv();
            };

            this.getZoom = function() {
                return map.getZoom();
            };

            this.getMapTypeId = function() {
                return map.getMapTypeId();
            };

            this.getBounds = function() {
                return map.getBounds();
            };

            this.getCenter = function() {
                return map.getCenter();
            };

            this.addListener = function(eventName, handler) {
                var listener = lr.maps.event.addListener(map, eventName, handler);

                return listener;
            };

            this.clearInstanceListeners = function() {
                lr.maps.event.clearInstanceListeners(map);
            };

            this.fromLatLngToPoint = function(latLng) {
                var projection = map.getProjection();

                return projection.fromLatLngToPoint(latLng);
            };

            this.fromLatLngToDivPixel = function(latLng) {
                var overlay = new google.maps.OverlayView();
                overlay.draw = function() {
                };
                overlay.setMap(map);

                return overlay.getProjection().fromLatLngToDivPixel(latLng);
            };

            this.addHotelMarker = function(markerOptions, clickFn) {
                latLngPosition = markerOptions.position;

                var marker = new lr.maps.HotelMarker(map, markerOptions, clickFn);

                mapBounds.extend(latLngPosition);

                return marker;
            };

            this.setMapBoundsToAddedMarkers = function() {
                map.fitBounds(mapBounds);
            };

            this.setOptions = function(options) {
                map.setOptions(options);
            };

            this.setCenter = function(position) {
                var latLng = new google.maps.LatLng(position.latitude, position.longitude);

                map.setCenter(latLng);
            };

            this.openInfoWindow = function(infoWindowOptions, anchor) {
                var infoWindow = new lr.maps.InfoWindow(infoWindowOptions);

                infoWindow.open(map, anchor);

                return infoWindow;
            };

            lr.maps.setupHotelMarker();
        },

        event:
        {
            addListener: function(instance, eventName, handler) {
                var listener = google.maps.event.addListener(instance, eventName, handler);

                return listener;
            },

            removeListener: function(listener) {
                google.maps.event.removeListener(listener);
            },

            clearInstanceListeners: function(instance) {
                google.maps.event.clearInstanceListeners(instance);
            }
        },

        LatLng: function(position) {
            return new google.maps.LatLng(position.Latitude || position.latitude, position.Longitude || position.longitude);
        },

        Icon: function(anchor, origin, scaledSize, size, url) {
            return { anchor: anchor, origin: origin, scaledSize: scaledSize, size: size, url: url };
        },

        Point: function(x, y) {
            var point = new google.maps.Point(x, y);

            return point;
        },

        Size: function(width, height, widthUnit, heightUnit) {
            var size = new google.maps.Size(width, height, widthUnit, heightUnit);

            return size;
        },

        InfoWindow: function(infoWindowOptions) {
            var infoWindow = new google.maps.InfoWindow(infoWindowOptions);
            var eventListeners = new Array();

            this.addEventListener = function(eventName, handler) {
                var listener = lr.maps.event.addListener(infoWindow, eventName, handler);

                eventListeners.push(listener);
            };

            this.removeEventListeners = function() {

                for (var index = 0, listeners = eventListeners.length; index < listeners; index++) {
                    var listener = eventListeners[index];

                    lr.maps.event.removeListener(listener);
                }

                eventListeners = new Array();
            };

            this.open = function(map, anchor) {
                infoWindow.open(map, anchor);
            };

            this.getContent = function() {
                return infoWindow.getContent();
            };

            this.setOptions = function(options) {
                infoWindow.setOptions(options);
            };

            this.close = function() {
                infoWindow.close();
            };
        },

        Geocoder: function() {
            var geocoder = new google.maps.Geocoder();

            this.geocode = function(request) {
                geocoder.geocode(request, handleGeocodeResponse);
            };

            function handleGeocodeResponse(result, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    lr.messageBus.publish("GeocoderRequestSuccess", result);
                }
                else {
                    lr.messageBus.publish("GeocoderRequestInvalid", { result: result, status: status });
                }
            };
        },

        setupHotelMarker: function() {
            function translateLatitudeAndLongitudeToCoordinates(hotelMarker, latitudeAndLongitude) {
                var projection = hotelMarker.getProjection();

                return projection.fromLatLngToDivPixel(latitudeAndLongitude);
            }

            lr.maps.HotelMarker = function(map, options, click) {
                this.setMap(map);
                this._position = options.position;
                this._resultNumber = options.resultNumber;
                this._title = options.title;
                this._ref = options.ref;
                this._click = click;

                this.setPosition = function(position) {
                    var left = position.x - (this._markerDimensions.width / 2);
                    var top = position.y - this._markerDimensions.height;

                    $(this._marker).css({
                        left: left + 'px',
                        top: top + 'px'
                    });
                };
            };

            lr.maps.HotelMarker.prototype = new google.maps.OverlayView();

            lr.maps.HotelMarker.prototype.draw = function() {
                var translatedCoordinates = translateLatitudeAndLongitudeToCoordinates(this, this._position);

                this.setPosition(translatedCoordinates);
            };

            lr.maps.HotelMarker.prototype.onAdd = function() {

                var marker = lr.core.dom.createElement("div", this._resultNumber, { "class": "hotel-marker", "title": this._title, "ref": this._ref });

                var panes = this.getPanes();

                panes.floatPane.appendChild(marker);
                var markerSelector = $(marker);

                this._marker = marker;
                this._markerDimensions = {
                    width: markerSelector.width(),
                    height: markerSelector.height()
                };

                if ($.isFunction(this._click)) {
                    markerSelector.bind("click", this._click);
                }
            };

            lr.maps.HotelMarker.prototype.onRemove = function() {
                this.setMap(null);

                var markerSelector = $(this._marker);

                markerSelector.unbind();

                markerSelector.remove();
            };
        }
    };

    lr.maps.directionService = lr.core.createClass();
    lr.maps.directionService.prototype = function() {
        var _directionsService = new google.maps.DirectionsService();

        this.calculateRoute = function(startPoint, endPoint, travelMode) {
            var request =
			{
			    origin: startPoint,
			    destination: endPoint,
			    travelMode: travelMode || google.maps.TravelMode.DRIVING
			};

            _directionsService.route(request, onRouteCalculated);
        };

        function onRouteCalculated(response, status) {
            if (status == google.maps.DirectionsStatus.OK) {
                lr.messageBus.publish("directionService_routeCalculated", response);
            }
            else {
                lr.messageBus.publish("directionService_routeCalculatedInvalid", status);
            }
        };
    };

    lr.maps.directionStepsRenderer = lr.core.createClass();
    lr.maps.directionStepsRenderer.prototype = function(templateEngine) {
        var _templateEngine = templateEngine;
        var _routeNumberedStepBuilder = lr.maps.routeNumberedStepBuilder;

        this.render = function(route, stringWriter) {
            var steps = _routeNumberedStepBuilder.getNumberedSteps(route);
            var leg = route.legs[0];

            var context =
			{
			    start_address: leg.start_address,
			    end_address: leg.end_address,
			    duration: leg.duration.text,
			    distance: leg.distance.text,
			    steps: steps,
			    copyright: route.copyrights || ""
			};

            var html = _templateEngine.getHtml("HotelDirectionSteps", context);

            stringWriter.write(html);
        };
    };

    lr.maps.routeNumberedStepBuilder =
	{
	    getNumberedSteps: function(route) {
	        var steps = new Array();

	        if (lr.core.nullOrUndefined(route)) {
	            return steps;
	        }

	        if (lr.core.nullOrUndefined(route.legs) || lr.core.array.isNotArray(route.legs)) {
	            return steps;
	        }

	        var leg = route.legs[0];

	        if (lr.core.nullOrUndefined(leg) || lr.core.array.isNotArray(leg.steps)) {
	            return steps;
	        }

	        for (var index = 0, stepNumbers = leg.steps.length; index < stepNumbers; index++) {
	            var currentStep = leg.steps[index];

	            var stepData =
				{
				    step_number: index + 1,
				    step_instruction: currentStep.instructions,
				    step_distance: currentStep.distance.text,
				    step_duration: currentStep.duration.text
				};

	            steps.push(stepData);
	        }

	        return steps;
	    }
	};

    lr.maps.hotelMarkerService = lr.core.createClass();
    lr.maps.hotelMarkerService.prototype = function() {
        this.addMarkersToMap = function(map, markerDetails, clickFn) {
            if (lr.core.array.isNotArray(markerDetails) || lr.core.array.isEmptyArray(markerDetails)) {
                return null;
            }

            var markers = new Array();
            var numberOfMarkers = markerDetails.length;
            var maximumNumberOfMarkers = numberOfMarkers > 50 ? 50 : numberOfMarkers;

            for (var index = 0; index < maximumNumberOfMarkers; index++) {
                var marker = addMarkerToMap(map, markerDetails[index], index + 1, clickFn);

                markers.push(marker);
            }

            return markers;
        };

        function addMarkerToMap(map, markerDetail, resultNumber, clickFn) {
            var latLng = lr.maps.LatLng({ latitude: markerDetail.Latitude, longitude: markerDetail.Longitude });

            return map.addHotelMarker(
				{
				    position: latLng,
				    resultNumber: resultNumber,
				    title: markerDetail.Name,
				    ref: markerDetail.Ref
				}, clickFn);
        };

        this.removeAllFromMap = function(markers) {
            if (lr.core.array.isNotArray(markers)) {
                return;
            }

            for (var index = 0, numberOfMarkers = markers.length; index < numberOfMarkers; index++) {
                removeFromMap(markers[index]);
            }
        };

        function removeFromMap(marker) {
            marker.onRemove();
        };
    };

    lr.maps.balloons = {};

    lr.maps.balloons.directionFormBalloon = lr.core.createClass();
    lr.maps.balloons.directionFormBalloon.prototype = function(map, directionForm) {
        var _map = map;
        var _infoWindow;
        var _directionForm = directionForm;

        function openInfoWindow(position, content, pixelOffset) {
            _infoWindow = _map.openInfoWindow({ position: position, content: content, pixelOffset: pixelOffset });

            _infoWindow.addEventListener("closeclick", onCloseClick);
            _infoWindow.addEventListener("domready", onDomReady);
        };

        function onCloseClick() {
            _infoWindow.removeEventListeners();

            _directionForm.unbindEvents();
        }

        function onDomReady() {
            _directionForm.initialize();
        }

        this.open = function(position) {
            var content = _directionForm.getFormAsHtml();
            var position = lr.maps.LatLng({ latitude: position.latitude, longitude: position.longitude });
            var pixelOffset = new lr.maps.Size(0, -32);

            openInfoWindow(position, content, pixelOffset);
        };

        this.close = function() {
            _infoWindow.close();
        };
    };

    lr.maps.balloons.blowupMapBalloon = lr.core.createClass();
    lr.maps.balloons.blowupMapBalloon.prototype = function(originalMap, mapDivId) {
        var _originalMap = originalMap;
        var _mapDivId = mapDivId;
        var _directionsRenderer = new google.maps.DirectionsRenderer();
        var _infoWindow = new lr.maps.InfoWindow();
        var _map;
        var _locationLatLng;

        this.open = function(locationLatLng) {
            _locationLatLng = locationLatLng;

            setMapOptions();

            styleMapDiv();

            openInfoWindow();
        };

        this.setDirections = function(directions) {
            _directionsRenderer.setDirections(directions);
        };

        function setMapOptions() {
            _map.setZoom(15);
            _map.setCenter(_locationLatLng);
        };

        function openInfoWindow() {
            var content = document.getElementById(_mapDivId);

            _infoWindow.setOptions(
				{
				    position: _locationLatLng,
				    maxWidth: 350,
				    content: content,
				    pixelOffset: new lr.maps.Size(0, 0)
				});

            _infoWindow.open(_originalMap);
        }

        function onInfoWindowClose() {
            resetMap();
        }

        function styleMapDiv() {
            $("#" + _mapDivId).css({ margin: "2px", padding: "2px" });
        }

        function init() {
            _infoWindow.addEventListener("closeclick", onInfoWindowClose);

            resetMap();
        }
        init();

        function resetMap() {
          
            var mapOptions =
			{			   
			    mapTypeId: google.maps.MapTypeId.ROADMAP,
			    disableDoubleClickZoom: false
			};

            var mapDiv = createMapDiv();

            $("body").append(mapDiv);

            _map = new google.maps.Map(mapDiv, mapOptions);

            _directionsRenderer.setMap(_map);
        }

        function createMapDiv() {
            return lr.core.dom.createElement("div", null, { id: _mapDivId });
        };
    };

    lr.maps.balloons.hotelInformationBalloon = lr.core.createClass();
    lr.maps.balloons.hotelInformationBalloon.prototype = function(map, templateEngine) {
        var _map = map;
        var _templateEngine = templateEngine;
        var _infoWindow;

        function openInfoWindow(position, content, pixelOffset) {
            _infoWindow = _map.openInfoWindow({ position: position, content: content, pixelOffset: pixelOffset, zIndex: 11000 });
        };

        this.open = function(hotel) {
            var data =
			{
			    hotelReference: hotel.HotelId,
			    link: hotel.Ref,
			    hotelName: hotel.Name,
			    starNumber: hotel.StarNumber,
			    starImage: hotel.StarImage,
			    city: hotel.City,
			    dates: hotel.Dates,
			    rates: hotel.Rates
			};

            var markerContent = _templateEngine.getHtml("HotelInformationBalloon", data);
            var position = lr.maps.LatLng({ latitude: hotel.Latitude, longitude: hotel.Longitude });
            var pixelOffset = new lr.maps.Size(0, -32);

            openInfoWindow(position, markerContent, pixelOffset);
        };

        this.close = function() {
            if (!lr.core.nullOrUndefined(_infoWindow)) {
                _infoWindow.close();
            }
        };
    };

    lr.maps.mapSettings = lr.core.createClass();
    lr.maps.mapSettings.prototype = function(defaultCenterPosition) {
        var _self = this;
        var _defaultCenterPosition = defaultCenterPosition;

        this.getDefaultCenterPosition = function() {
            var positionAsJson = lr.http.cookie.getCookie("defaultMapCenter");

            if (lr.core.string.isNonEmpty(positionAsJson)) {
                return JSON.parse(positionAsJson);
            }

            return _defaultCenterPosition;
        };

        this.setDefaultCenterPosition = function(value) {
            window.mapCentre = value;

            var positionAsJson = JSON.stringify(value);

            lr.http.cookie.createCookie("defaultMapCenter", positionAsJson, 1);

            _defaultCenterPosition = value;
        };

        this.getZoomLevel = function() {
            return lr.http.cookie.getCookie("defaultZoomLevel");
        };

        this.setZoomLevel = function(value) {
            lr.http.cookie.createCookie("defaultZoomLevel", value, 1);
        };

        function init() {
            _self.setDefaultCenterPosition(_defaultCenterPosition);
        }
        init();
    };
})();
