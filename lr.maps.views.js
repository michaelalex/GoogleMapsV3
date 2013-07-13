/// <reference path="lr.js" />

lr.maps.views = lr.maps.views || {};

lr.maps.views.hotelMapAndDirectionStepsView = lr.core.createClass();
lr.maps.views.hotelMapAndDirectionStepsView.prototype = function(templateEngine, divId) 
{
    var _routes;
    var _stepsDivId = divId;
    var _writer = new lr.stringWriter();
    var _directionStepsRenderer = new lr.maps.directionStepsRenderer(templateEngine);
    
    function getStepsAsHtml() 
    {
        _writer.clear();
        
        _directionStepsRenderer.render(_routes, _writer);

        return _writer.getString();
    }

    function onRouteCalculated(response) 
    {
        _routes  = response.routes[0];
        var html = getStepsAsHtml(_routes);

        writeStepsToPage(html);        
        bindEvents();
    }
    
    function bindEvents() 
    {
        $("#" + _stepsDivId).find("label[step-number]").click(onStepNumberClick);
    }

    function writeStepsToPage(string)
    {
        $("#" + _stepsDivId).html(string);
    }

    function onStepNumberClick(evt)
    {
        var element     = evt.srcElement || evt.target;
        var stepNumber  = element.getAttribute("step-number");
        var steps       = _routes.legs[0].steps;
        var step;

        if (stepNumber === "first") 
        {
            step = steps[0];
        }
        else if (stepNumber === "last") 
        {
            var numberOfSteps = steps.length;
            step = steps[numberOfSteps - 1];
        } 
        else 
        {
            step = steps[stepNumber - 1];
        }

        lr.messageBus.publish("hotelMapAndDirectionStepsView_stepNumberClick", { step: step });
    }
    
    function init() 
    {
        subscribeToMessages();
    }
    init();

    function subscribeToMessages() 
    {
	    lr.messageBus.subscribe("GeocoderRequestSuccess", onGeocodeResponseReceived);
        lr.messageBus.subscribe("directionService_routeCalculated", onRouteCalculated);
    }

	function onGeocodeResponseReceived(result)
	{
		if (result.length > 1) 
		{
			$("#" + _stepsDivId).html("");
		}
	}
};

lr.maps.views.hotelMapAndDirectionView = lr.core.createClass();
lr.maps.views.hotelMapAndDirectionView.prototype = function(templateEngine, viewData) 
{
    var _mapDivId           = viewData.mapDivId;
	var _showOnMapLinkId	= viewData.showOnMapLinkId;
	var _getDetailedDirectionsLinkId = viewData.getDetailedDirectionsLinkId;
    var _hotel              = viewData.hotel;
    var _resources          = viewData.resources;
    var _form               = new lr.maps.views.hotelDirectionFormView(templateEngine, _resources, _hotel);
    var _routeCalculator    = new lr.maps.directionService();
    var _directionRenderer  = new google.maps.DirectionsRenderer();
    var _closeUpMapBalloon, _directionFormBalloon, _map, _googleMap;

    function getMapOptions() 
    {
        var zoomLevel = 11;
        var center    = lr.maps.LatLng({ latitude: _hotel.latitude, longitude: _hotel.longitude });

        var mapOptions =
        {
            center: center,           
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoom: zoomLevel,
            disableDoubleClickZoom: false
        };

        return mapOptions;
    }

    function createMap() 
    {
        var mapDiv  = document.getElementById(_mapDivId);
        var options = getMapOptions();
   
        _map        = new lr.maps.Map(mapDiv, options);
	    _googleMap	= _map.getMap();
    }
    
    function addHotelToMap() 
    {
        var markerOptions =
        {
            position: lr.maps.LatLng({ latitude: _hotel.latitude, longitude: _hotel.longitude }),
            title: _hotel.name || _hotel.Name
        };

        _map.addHotelMarker(markerOptions, onHotelMarkerClick);
    }

    function init() 
    {
        createMap();

        addHotelToMap();
		
        _directionRenderer.setMap(_googleMap);

        _closeUpMapBalloon      = new lr.maps.balloons.blowupMapBalloon(_googleMap, "closeup-map");
        _directionFormBalloon   = new lr.maps.balloons.directionFormBalloon(_map, _form);

        subscribeToMessages();

	    unbindEvents();

	    bindEvents();
    }
    init();
    
    function unbindEvents()
	{
	    $("#" + _showOnMapLinkId).unbind();
	    $("#" + _getDetailedDirectionsLinkId).unbind();
    }
    
    function bindEvents() 
    {
	    $("#" + _showOnMapLinkId).bind("click", onShowOnMapClick);
	    $("#" + _getDetailedDirectionsLinkId).bind("click", onGetDetailedDirectionsClick);
    }
    
    function onGetDetailedDirectionsClick() 
    {
	    _directionFormBalloon.open({ latitude: _hotel.latitude, longitude: _hotel.longitude });
    }
    
    function onShowOnMapClick() 
    {
	    _map.setCenter({ latitude: _hotel.latitude, longitude: _hotel.longitude });
    }
    
    function onRouteCalculated(response)
    {
        _directionRenderer.setDirections(response);
        _closeUpMapBalloon.setDirections(response);

	    _directionFormBalloon.close();
    }

    function subscribeToMessages() 
    {
        lr.messageBus.subscribe("hotelDirectionForm_getDirectionsClick", onGetDirectionsClick);
        lr.messageBus.subscribe("directionService_routeCalculated", onRouteCalculated);
        lr.messageBus.subscribe("directionService_routeCalculatedInvalid", onRouteCalculatedInvalid);
        lr.messageBus.subscribe("hotelMapAndDirectionStepsView_stepNumberClick", onStepNumberClick);
        lr.messageBus.subscribe("GeocoderRequestSuccess", onGeocodeResponseReceived);
    }
    
    function onRouteCalculatedInvalid(status)
    {
	    if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) 
	    {
		    alert("Too Many Queries: The daily geocoding quota for this site has been exceeded.");
	    }
	    else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) 
	    {
		    alert("Bad Key: The API key is either invalid or does not match the domain for which it was given");
	    }
	    else if (status === google.maps.GeocoderStatus.INVALID_REQUEST) 
	    {
		    alert("A directions request could not be successfully parsed.");
	    } 
	    else 
	    {
		    alert(_resources.NoMapResults);
	    }    
    }

    function onHotelMarkerClick() 
    {
        var position = { latitude: _hotel.latitude, longitude: _hotel.longitude };

        _directionFormBalloon.open(position);
    }

    function onStepNumberClick(data) 
    {
        _closeUpMapBalloon.open(data.step.start_location);
    }

    function onGetDirectionsClick(data) 
    {
        var geocoder    = new lr.maps.Geocoder();
        var address     = "";

        if (lr.core.string.isString(data.origin)) 
        {
            address = data.origin;
        }
        else if (lr.core.string.isString(data.destination)) 
        {
            address = data.destination;
        }

        if (lr.core.string.isNonEmpty(address)) 
        {
            _data = data;
            geocoder.geocode({ address: address });
        } 
        else 
        {
            _routeCalculator.calculateRoute(data.origin, data.destination, data.travelMode);   
        }
    }

    var _data;
    function onGeocodeResponseReceived(result)
    {
        if (result.length === 1) 
        {
            _routeCalculator.calculateRoute(_data.origin, _data.destination, _data.travelMode);   
        }
    }
};

lr.maps.views.didYouMeanAddressView = lr.core.createClass();
lr.maps.views.didYouMeanAddressView.prototype = function(templateEngine, resources, divId) 
{
    var _divId          = divId;
    var _templateEngine = templateEngine;
    var _resources      = resources;

    function init() 
    {
        subscribeToMessages();
    };
    init();

    function subscribeToMessages()
    {
        lr.messageBus.subscribe("GeocoderRequestSuccess", onAddressLookupCompleted);
        lr.messageBus.subscribe("directionService_routeCalculated", onRouteCalculated);
    }
    
    function onRouteCalculated() 
    {
        unbindEvents();
        $("#" + _divId).html("");
    }

    function onAddressLookupCompleted(result) 
    {
        if (result.length < 2) {
            return;
        }

        var context =
        {
            didYouMean: _resources.strings.didYouMean,
            addresses: getFormattedAddresses(result)
        };
        
        var html = _templateEngine.getHtml("DidYouMeanTemplate", context);

        $("#" + _divId).html(html);

        bindEvents();
    }
    
    function unbindEvents() 
    {
        $("#did-you-mean-list").children("li").unbind();
    }
    
    function bindEvents() 
    {
        $("#did-you-mean-list").children("li").bind("click", onAddressItemClick);
    }

    function onAddressItemClick(evt) 
    {
        var element     = evt.srcElement || evt.target;
        var latitude    = element.getAttribute("lat");
        var longitude   = element.getAttribute("lng");

        var addressLatLng = lr.maps.LatLng({ latitude: latitude, longitude: longitude });

        lr.messageBus.publish("didYouMeanAddressView_addressItemClick", addressLatLng);
    }

    function getFormattedAddresses(result) 
    {
        var addressList = new Array();
        
        for (var index = 0, numberOfAddresses = result.length; index < numberOfAddresses; index++) 
        {
            var address = result[index];

            var item =
            {
                address: address.formatted_address,
                lat: address.geometry.location.lat(),
                lng: address.geometry.location.lng()
            };

            addressList.push(item);
        }
        
        return addressList;
    }
};

lr.maps.views.specialOffersView = lr.core.createClass();
lr.maps.views.specialOffersView.prototype = function() 
{
	var _specialOffersCheckboxId = "#so1";
	
	this.resetForm = function()
	{
		$(_specialOffersCheckboxId).attr("checked", false);
	};
	
	function unbindEvents()
	{
		$(_specialOffersCheckboxId).unbind();		
	}
	
	function bindEvents() 
	{
		$(_specialOffersCheckboxId).bind("click", onSpecialOffersCheckboxClick);
	}
	
	function onSpecialOffersCheckboxClick(evt) 
	{
		var specialOffersOnly = $(evt.srcElement || evt.target).is(":checked");

		lr.messageBus.publish("specialOffersView_onSpecialOffersClick", specialOffersOnly);
	}
	
	function init() 
	{
		unbindEvents();
		
		bindEvents();

		subscribeToMessages();
	}
	init();
	
	function subscribeToMessages()
	{
		lr.messageBus.subscribe("UpdateAllCounters", onAllCountersUpdated);
	}
	
	function onAllCountersUpdated(eventArgs)
	{
		var counters			= JSON.parse(eventArgs.data);
		var specialOffersArray	= counters.SpecialOffers;
		var numberOfSpecialOffers = 0;

		setCounterText("");
		
		for (var index = 0, numberOfItems = specialOffersArray.length; index < numberOfItems; index++)
		{
			var specialOffer = specialOffersArray[index];
			
			if (specialOffer.Key === 1 /* Special offers enabled */)
			{
				numberOfSpecialOffers = specialOffer.Value;
				break;
			}
		}

		setCounterText("(" + numberOfSpecialOffers + ")");
	}
	
	function setCounterText(text) {
		var labelContext = $("label[for='so1']");
		var counterSpan	 = $("span[class='counter']", labelContext);
		
		counterSpan.text(text);
	}
};

lr.maps.views.accommodationTypePanelView = lr.core.createClass();
lr.maps.views.accommodationTypePanelView.prototype = function() 
{
	var _accommodationTypeCheckboxSelector = "input[class='accType']";
	
	this.resetForm = function()
	{
		$(_accommodationTypeCheckboxSelector).each(function(index)
			{	
				$(this).attr("checked", false);
			});
	};
	
	function unbindEvents()
	{
		$(_accommodationTypeCheckboxSelector).unbind();
	}
	
	function bindEvents() 
	{
		$(_accommodationTypeCheckboxSelector).bind("click", onAccommodationTypeClick);
	}
	
	function onAccommodationTypeClick(evt) 
	{
		var checkbox				= $(evt.srcElement || evt.target);
		var isChecked				= checkbox.attr("checked") == "checked";
		var accommodationTypeValue	= checkbox.attr("value");
		
		var data =
		{
			accommodationType:
			{
				isChecked: isChecked,
				value: accommodationTypeValue
			},
			checkedAccommodationTypes: getCheckedAccommodationTypeAsArray()
		};
		
		lr.messageBus.publish("accommodationTypePanelView_onAccommodationTypeClick", data);
	}
	
	function getCheckedAccommodationTypeAsArray() 
	{
		return $(_accommodationTypeCheckboxSelector + ":checked").map(
			function()
			{
				return this.value;
			}).get();
	}
	
	function init() 
	{
		unbindEvents();
		
		bindEvents();
		
		subscribeToMessages();
	}
	init();
	
	function subscribeToMessages()
	{
		lr.messageBus.subscribe("UpdateAllCounters", onAllCountersUpdated); 
	}
	
	function onAllCountersUpdated(eventArgs)
	{
		var counters			= JSON.parse(eventArgs.data);
		var accommodationTypes	= counters.AccomodationTypes;

		clearCounterText();
		
		for (var index = 0, numberOfAccommodationTypes = accommodationTypes.length; index < numberOfAccommodationTypes; index++)
		{
			var accommodationType	= accommodationTypes[index];
			var accommodationTypeId = accommodationType.Key;
			var numberOfHotels		= accommodationType.Value;
			
			var labelContext	= $("label[for='acc" + accommodationTypeId + "']");
			var counterSpan		= $("span[class='counter']", labelContext);
			
			counterSpan.text("(" + numberOfHotels + ")");
		}
	}
	
	function clearCounterText() 
	{
		$("#AccommodationFilters span[class='counter']").each(function() 
		{
			$(this).text("");
		});
	}
};

lr.maps.views.facilitiesPanelView = lr.core.createClass();
lr.maps.views.facilitiesPanelView.prototype = function() 
{
	var _facilitiesCheckboxSelector = "input[class='fac']";
	
	this.resetForm = function()
	{
		$(_facilitiesCheckboxSelector).each(function()
			{
				$(this).attr("checked", false);
			});		
	};

	function unbindEvents() 
	{
		$(_facilitiesCheckboxSelector).unbind();
	}

	function bindEvents() 
	{
		$(_facilitiesCheckboxSelector).bind("click", onFacilitiesClick);
	}
	
	function onFacilitiesClick(evt) 
	{
		var checkbox		= $(evt.srcElement || evt.target);
		var isChecked		= checkbox.attr("checked");
		var value			= checkbox.attr("value");
		var id				= checkbox.attr("id");
		var facilityName	= $("label[for='" + id + "']").text();

		var data =
		{
			facility:
			{	
				id:			value,
				name:		facilityName,
				isChecked:	isChecked
			},
			checkedFacilities: getCheckedFacilitiesAsArray()
		};
		
		lr.messageBus.publish("facilitiesPanelView_onFacilitiesClick", data);
	}
	
	function getCheckedFacilitiesAsArray() 
	{
		return $(_facilitiesCheckboxSelector + ":checked").map(
			function()
			{
				return this.value;
			}).get();
	}
	
	function init() 
	{
		unbindEvents();

		bindEvents();
		
		subscribeToMessages();
	}
	init();
	
	function subscribeToMessages()
	{
		lr.messageBus.subscribe("UpdateAllCounters", onAllCountersUpdated);
	}
	
	function clearCounterText() 
	{
		$("#facilitiesFilter span[class='counter']").each(function() 
		{
			$(this).text("");
		});
	}
	
	function onAllCountersUpdated(eventArgs)
	{
		var counters		= JSON.parse(eventArgs.data);
		var facilitiesArray = counters.Facilities;

		clearCounterText();
		
		for (var index = 0, numberOfFacilities = facilitiesArray.length; index < numberOfFacilities; index++)
		{
			var facility		= facilitiesArray[index];
			var facilityId		= facility.Key;
			var numberOfHotels	= facility.Value;
			
			var labelContext = $("label[for='fac" + facilityId + "']");
			var counterSpan	 = $("span[class='counter']", labelContext);
			
			if (counterSpan.size() == 0)
			{
				continue;
			}
			
			counterSpan.text("(" + numberOfHotels + ")");
			
			if (numberOfHotels == 0)
			{
				counterSpan.addClass("lr-filter-zeroed");
			}
		}
	}
};

lr.maps.views.starRatingPanelView = lr.core.createClass();
lr.maps.views.starRatingPanelView.prototype = function() 
{
	var _starRatingCheckboxSelector = "input[class='starRating']";
	
	this.resetForm = function()
	{
		$(_starRatingCheckboxSelector).each(function()
			{
				$(this).attr("checked", false);
			});	
	};
	
	function unbindEvents()
	{
		$(_starRatingCheckboxSelector).unbind();
	}
	
	function bindEvents() 
	{
		$(_starRatingCheckboxSelector).bind("click", onStarRatingClick);
	}
	
	function onStarRatingClick(evt) 
	{
		var checkbox	= $(evt.srcElement || evt.target);
		var isChecked	= checkbox.attr("checked") === "checked";
		var starRating	= checkbox.attr("value");
		
		lr.messageBus.publish("starRatingPanelView_onStarRatingClick", { starRating: { isChecked: isChecked, value: starRating }, checkedRatings: getCheckedStarRatingsAsArray() });
	}
	
	function getCheckedStarRatingsAsArray() 
	{
		return $(_starRatingCheckboxSelector + ":checked").map(
			function()
			{
				return this.value;
			}).get();
	}
	
	function init() 
	{
		unbindEvents();
		
		bindEvents();
		
		subscribeToMessages();
	}
	init();
	
	function subscribeToMessages()
	{
		lr.messageBus.subscribe("UpdateAllCounters", onAllCountersUpdated);
	}
	
	function clearCounterText() 
	{
		$("#starRatingsFilter span[class='counter']").each(function() 
		{
			$(this).text("");
		});
	}
	
	function onAllCountersUpdated(eventArgs)
	{
		var counters			= JSON.parse(eventArgs.data);
		var starRatingsArray	= counters.StarRatings;

		clearCounterText();
		
		for (var index = 0, numberOfStarRatings = starRatingsArray.length; index < numberOfStarRatings; index++)
		{
			var starRatingItem	= starRatingsArray[index];
			var starRating		= starRatingItem.Key;
			var numberOfHotels	= starRatingItem.Value;
			var realStarRating	= 5 - (starRating - 1);
			
			var classSuffix		= realStarRating > 1 ? "Stars" : "Star"; 
			
			var labelContext	= $("label[class='star-" + realStarRating + " " + classSuffix + "']");
			var counterSpan		= $("span[class='counter']", labelContext);
			
			if (counterSpan.size() > 0) {
				counterSpan.text("(" + numberOfHotels + ")");
			}
		}
	}
};

lr.maps.views.resetFiltersPanelView = lr.core.createClass();
lr.maps.views.resetFiltersPanelView.prototype = function()
{
	var _resetFiltersLinkId = "#resetlink";
	var _resetResultsLinkId = "#resetter";

	function init()
	{
		unbindEvents();
		
		bindEvents();
	}
	init();
		
	function unbindEvents()
	{
		$(_resetFiltersLinkId).unbind();
		$(_resetResultsLinkId).unbind();
	}
	
	function bindEvents()
	{
		$(_resetFiltersLinkId).bind("click", onResetClick);
		$(_resetResultsLinkId).bind("click", onResetClick);
	}
	
	function onResetClick()
	{
		lr.messageBus.publish("resetFiltersPanelView_onResetClick");
	}
};

lr.maps.views.guestRatingPanelView = lr.core.createClass();
lr.maps.views.guestRatingPanelView.prototype = function() 
{
	var _guestRatingCheckboxSelector = "input[class='guestRating']";
	
	this.resetForm = function()
	{
		$(_guestRatingCheckboxSelector).each(function(index)
			{
				$(this).attr("checked", false);
			});	
	};
	
	function unbindEvents()
	{
		$(_guestRatingCheckboxSelector).unbind();
	}
	
	function bindEvents()
	{
		$(_guestRatingCheckboxSelector).bind("click", onGuestRatingClick);
	}
	
	function onGuestRatingClick(evt) 
	{
		var checkbox	= $(evt.srcElement || evt.target);
		var isChecked	= checkbox.attr("checked") === "checked";
		var guestRating	= checkbox.attr("value");

		var data =
		{
			guestRating:
			{
				value: guestRating,
				isChecked: isChecked
			},
			checkedGuestRatings: getCheckedGuestRatingsAsArray()
		};
		
		lr.messageBus.publish("guestRatingPanelView_onGuestRatingClick", data);
	}
	
	function getCheckedGuestRatingsAsArray() 
	{
		return $(_guestRatingCheckboxSelector + ":checked").map(
			function()
			{
				return this.value;
			}).get();
	}
	
	function init() 
	{
		unbindEvents();
		
		bindEvents();
		
		subscribeToMessages();
	}
	init();

	function subscribeToMessages()
	{
		lr.messageBus.subscribe("UpdateAllCounters", onAllCountersUpdated);
	}
	
	function onAllCountersUpdated(eventArgs)
	{
		clearCounterText();
		
		var counters	 = JSON.parse(eventArgs.data);
		var guestRatings = counters.GuestRatings;
				
		for (var index = 0, numberOfGuestRatings = guestRatings.length; index < numberOfGuestRatings; index++)
		{
			var guestRatingItem = guestRatings[index];
			var guestRating		= guestRatingItem.Key;
			var numberOfHotels	= guestRatingItem.Value; 
			
			var guestClass		= guestRating === 1 ? "Guest" : "Guests";
			var selector		= lr.core.string.format("label[class='guest-{0} {1} cr{0}']", [ guestRating, guestClass ]);
			
			var labelContext	= $(selector);
			var counterSpan		= $("span[class='counter']", labelContext);
						
			counterSpan.text("(" + numberOfHotels + ")");
		}
	}
	
	function clearCounterText()
	{
		for (var index = 1; index <= 6; index++)
		{
			var guestClass   = index === 1 ? "Guest" : "Guests";
			var selector 	 = lr.core.string.format("label[class='guest-{0} {1} cr{0}']", [ index, guestClass ]);
			var labelContext = $(selector);
			var counterSpan	 = $("span[class='counter']", labelContext);
			
			counterSpan.text("");
		}
	}
};

lr.maps.views.pricePanelView = lr.core.createClass();
lr.maps.views.pricePanelView.prototype = function(prefix, postfix, defaultMinPrice, defaultMaxPrice, selectedMinPrice, selectedMaxPrice) 
{
	var _sliderId			= "#slider";
	var _currencyDropdownId	= "#currencies";
	var _minPriceSpanId		= "#minPrice";
	var _maxPriceSpanId		= "#maxPrice";
	var _minPriceTextId		= "#priceRangeMinText";
	var _maxPriceTextId		= "#priceRangeMaxText";
	var _defaultMinPrice	= defaultMinPrice;
	var _defaultMaxPrice	= defaultMaxPrice;
	var _selectedMinPrice	= selectedMinPrice;
	var _selectedMaxPrice	= selectedMaxPrice;
	var _priceRangeType		= true;
	var _prefix				= prefix;
	var _postfix			= postfix;
	var _slider;
	var _selectedPriceRangeValues = [_selectedMinPrice, _selectedMaxPrice];
	
	function setDefaultMinimumPrice()
	{
		$(_minPriceSpanId).text(_defaultMinPrice);
		$(_minPriceTextId).text(_prefix + _selectedMinPrice + _postfix);
	}
	
	function setDefaultMaximumPrice()
	{
		$(_maxPriceSpanId).text(_defaultMaxPrice);
		$(_maxPriceTextId).text(_prefix + _selectedMaxPrice + _postfix);
	}

	this.resetForm = function()
	{
		setDefaultMinimumPrice();
		setDefaultMaximumPrice();
		
		_slider.slider("min", _selectedMinPrice);
		_slider.slider("max", _selectedMaxPrice);
		_slider.slider("values", 0, _selectedMinPrice);
		_slider.slider("values", 1, _selectedMaxPrice);
	};
	
	function unbindEvents()
	{
		$(_currencyDropdownId).unbind();
	}
	
	function bindEvents() 
	{
		$(_currencyDropdownId).bind("change", onCurrencySelectChange);
	}
	
	function onCurrencySelectChange() 
	{
		var currency = $(_currencyDropdownId).val();
		var minPrice = $(_minPriceTextId).text();
		var maxPrice = $(_maxPriceTextId).text();

		lr.messageBus.publish("pricePanelView_onCurrencySelectChange", { currency: currency, minPrice: minPrice, maxPrice: maxPrice });
	}
	
	function init() 
	{
		initializeSlider();
	
		unbindEvents();
		
		bindEvents();

		setDefaultMinimumPrice();
		setDefaultMaximumPrice();

		setMinimumPriceRangeText(_selectedMinPrice);
		setMaximumPriceRangeText(_selectedMaxPrice);
	}
	init();
	
	function initializeSlider()
	{
		_slider = $(_sliderId).slider(
		{
			range:		_priceRangeType || true,
			min:		_defaultMinPrice,
			max:		_defaultMaxPrice,
			animate:	"slow",
			slide:		onSliderSlide,
			stop:		onSliderStop,
			values:		_selectedPriceRangeValues
		});
	}
	
	function onSliderSlide(event, ui)
	{
		if (!ui.values) 
		{
			ui.values = [0, ui.value];
		}

		setMinimumPriceRangeText(ui.values[0]);
		setMaximumPriceRangeText(ui.values[1]);
	}
	
	function setMinimumPriceRangeText(minimumPrice) 
	{
		var minPrice			= _prefix + minimumPrice + _postfix;
		var minimumPriceText	= _priceRangeType === true ? minPrice : (_prefix + _selectedMinPrice + _postfix);
		
		$(_minPriceSpanId).val(minimumPrice);
        $(_minPriceTextId).text(minimumPriceText);
	}

	function setMaximumPriceRangeText(maximumPrice) 
	{
		var maximumPrice = _prefix + maximumPrice + _postfix;
		
        $(_maxPriceSpanId).val(maximumPrice);
        $(_maxPriceTextId).text(maximumPrice);
	}

	function onSliderStop(event, ui)
	{
		if (!ui.values) 
		{
			ui.values = [0, ui.value];
		}

		var data =
		{
			minPrice: _priceRangeType === true ? ui.values[0] : _selectedMinPrice,
			maxPrice: ui.values[1]
		};

		lr.messageBus.publish("pricePanelView_onSliderStop", data);
	}
};

lr.maps.views.distancePanelView = lr.core.createClass();
lr.maps.views.distancePanelView.prototype = function(mileRangeValues, kilometerRangeValues, selectedRangeValue, isInMiles)
{
	var _mileRangeValues		= mileRangeValues;
	var _kilometerRangeValues	= kilometerRangeValues;
	var _selectedRangeValue		= selectedRangeValue;
	var _isInMiles				= isInMiles;
	var _sliderId				= "#radiusslider";
	var _minRadiusSpanId		= "#minRadius";
	var _maxRadiusSpanId		= "#maxRadius";
	var _distanceUnitDropDownId = "#DistanceUnit";
	var _currentRangeSpanId		= "#radiusRangeMaxText";
	var _rangeMilesSpanId		= "#radiusRangeMaxTextMiles";
	var _rangeKilometersSpanId	= "#radiusRangeMaxTextKiloMeters";
	
	function setDefaultValuesForMiles()
	{
		$(_distanceUnitDropDownId)[0].selectedIndex = 0;
		
		var maximumMileRangeValue = _mileRangeValues[_mileRangeValues.length - 1];
		
		$(_maxRadiusSpanId).text(maximumMileRangeValue);
		
		$(_currentRangeSpanId).text(_selectedRangeValue);
		
		$(_rangeMilesSpanId).css("display", "inline");
		$(_rangeKilometersSpanId).css("display", "none");
		
		$(_sliderId).slider( "value", _selectedRangeValue );
		$(_sliderId).slider( "max", maximumMileRangeValue );
	}
	
	function setDefaultValuesForKilometers()
	{
		$(_distanceUnitDropDownId)[0].selectedIndex = 1;
		
		var maximumKilometerRangeValue = _kilometerRangeValues[_kilometerRangeValues.length - 1];
		
		$(_maxRadiusSpanId).text(maximumKilometerRangeValue);
		
		$(_currentRangeSpanId).text(_selectedRangeValue);

		$(_rangeMilesSpanId).css("display", "none");
		$(_rangeKilometersSpanId).css("display", "inline");
		
		$(_sliderId).slider( "value", _selectedRangeValue );
		$(_sliderId).slider( "max", maximumKilometerRangeValue );
	}
	
	this.resetForm = function()
	{
		if (_isInMiles)
		{
			setDefaultValuesForMiles();
		}
		else
		{
			setDefaultValuesForKilometers();
		}	
	};
	
	function isRangeInMiles()
	{
		return $(_distanceUnitDropDownId).val() == "Miles";
	}
		
	function init() 
	{
		initializeSlider();
	
		unbindEvents();
		
		bindEvents();
		
		setMileKilometerDisplay();
	}
	init();
	
	function setMaxRangeValue(ui)
	{
		$(_currentRangeSpanId).text(ui.value);
	}
	
	function onSlide(event, ui)
	{
		setMaxRangeValue(ui);
	}
	
	function onSliderStop(event, ui)
	{
		setMaxRangeValue(ui);
		
		var unit	  = $(_distanceUnitDropDownId).val().toLowerCase();
		var maxRadius = ui.value;
		
		lr.messageBus.publish("radiusSlider_onSliderStop", { maxRadius: maxRadius, radiusUnit: unit });
	}
	
	function initializeSlider()
	{
		var minValue = "1";
		var maxValue = getMaxValueForSlider();
	
		$(_minRadiusSpanId).text(minValue);
		$(_maxRadiusSpanId).text(maxValue);
							
		$(_sliderId).slider(
		{
			range:		"max",
			min:		parseInt(minValue),
			max:		maxValue,
			animate:	true,
			slide:		onSlide,
			stop:		onSliderStop,
			value:		_selectedRangeValue	
		});
	}
	
	function getMaxValueForSlider()
	{
		return isRangeInMiles() ? _mileRangeValues[_mileRangeValues.length - 1] : _kilometerRangeValues[_kilometerRangeValues.length - 1];
	}
	
	function unbindEvents()
	{
		$(_distanceUnitDropDownId).unbind();
	}
	
	function bindEvents()
	{
		$(_distanceUnitDropDownId).bind("change", onDistanceUnitChange);
	}
	
	function onDistanceUnitChange() 
	{		
		$(_sliderId).slider( "option", "max", getMaxValueForSlider() );
	
		var currentValue = $(_sliderId).slider( "option", "value" );
		
		if ($(_distanceUnitDropDownId).val() === "Miles") 
		{	
			currentValue = Math.ceil(currentValue * (5 / 8));
		}
		else
		{	
			currentValue = Math.ceil(currentValue * (8 / 5));
		}
		$(_sliderId).slider("option", "value", currentValue);
	
		setMileKilometerDisplay();
	}
	
	function setMileKilometerDisplay()
	{
		var selectedValue = $(_distanceUnitDropDownId).val();
		
		if (selectedValue === "Miles")
		{
			$(_rangeMilesSpanId).css("display", "inline");
			$(_rangeKilometersSpanId).css("display", "none");
			$(_maxRadiusSpanId).text(_mileRangeValues[_mileRangeValues.length - 1]);
		}
		else
		{
			$(_rangeMilesSpanId).css("display", "none");
			$(_rangeKilometersSpanId).css("display", "inline");
			$(_maxRadiusSpanId).text(_kilometerRangeValues[_kilometerRangeValues.length - 1]);
		}
		
		var currentValue = $(_sliderId).slider( "option", "value" );
		$(_currentRangeSpanId).text(currentValue == 0 ? 1 : currentValue);
	}
};


lr.maps.views.hotelSearchListView = lr.core.createClass();
lr.maps.views.hotelSearchListView.prototype = function(resultType, pageNumber) 
{
	var _resultType					= resultType;
	var _pageNumber					= pageNumber;
	var _resultsDivId				= "#searchresults";
	var _sortImageSelector			= "img[class=sort-icon]";
	var _loadingResultsDivId		= "#updateresultsholder";
	var _resultsTableRowsSelector	= "#searchresults .lr-hotel-row, #results table tr";
	var _indicatorLinkSelector		= "a[class='lr-map-indicator indicate']";
		
	function init()
	{
		unbindEvents();
		
		bindEvents();

		subscribeToMessages();

		showIndicatorsWhenMapShown();
	}
	init();
	
	function showIndicatorsWhenMapShown() 
	{
		var mapIsHidden = $("#mapHolder").css("display") === "none";
		
		$(_indicatorLinkSelector).css("display", (mapIsHidden ? "none" : "block"));
    }

	function subscribeToMessages() 
	{
		lr.messageBus.subscribe("hotelSearchController_beforeGetHotelsRequest", beforeRequest);
		lr.messageBus.subscribe("GetHotelsWithSort", getHotelWithSortSuccess, 0);
		lr.messageBus.subscribe("GetHotelsWithStarRating", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithGuestRating", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithSpecialOffers", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithFacilities", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithAccommodationType", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithPrice", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithRadius", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithAttraction", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("GetHotelsWithGeoBounds", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("CurrencyChange", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("ClearAllSearchFilters", onGetHotelRequestCompleted, 0);
		lr.messageBus.subscribe("RefreshFilters", onGetHotelRequestCompleted, 0);
	}

	function bindEvents() 
	{
		$(_sortImageSelector, $(_resultsDivId)).bind("click", onSortClick);
		
		if (lr.core.string.isString(_resultType) && _resultType.toLowerCase() === "standard")
		{
			$(_resultsTableRowsSelector).bind("mouseover", onHotelRowMouseOver);
			$(_resultsTableRowsSelector).bind("mouseout", onHotelRowMouseOut);
			$(_resultsTableRowsSelector).bind("click", onHotelRowClick);
		}

		$(_indicatorLinkSelector).bind("click", onHotelIndicatorClick);
	}
	
	function onHotelIndicatorClick(evt) 
	{	
		var hyperlink = $(evt.srcElement || evt.target);

		var hotelReference = hyperlink.attr("href").replace("#ref:", "");

		lr.messageBus.publish("hotelSearchListView_onHotelIndicatorClick", { element: hyperlink, hotelReference: hotelReference });
	}

	function unbindEvents() 
	{
		$(_indicatorLinkSelector).unbind();
		
		$(_sortImageSelector, $(_resultsDivId)).unbind();
		
		$(_resultsTableRowsSelector).unbind();

		$(_indicatorLinkSelector).unbind();
	}
	
	function onHotelRowClick()
	{
		window.location.href = $('.lr-details-link', this).attr('href');
	}
	
	function onHotelRowMouseOut()
	{
		if ($(this).hasClass("tabletop"))
		{
			return;
		}
		
		$(this).removeClass("highlightedresult").removeClass("hover");
	}
	
	function onHotelRowMouseOver()
	{
		if ($(this).hasClass("tabletop"))
		{
			return;
		}
		
		$(this).addClass("highlightedresult").addClass("hover");
	}
	
	function onSortClick(evt) 
	{
		var element = evt.srcElement || evt.target;
		var currentSortColumn = element.getAttribute("sort-column");
		var currentSortDirection = element.getAttribute("sort-direction");
	
		lr.messageBus.publish("hotelSearchListView_onHeaderSortClick", { sortColumn: currentSortColumn, sortDirection: currentSortDirection });
	}
	
	function beforeRequest() 
	{
		unbindEvents();
		
		$('a[rel=flyout]', $(_resultsDivId)).carouselflyout('destroy');
		$("#reset").hide();
		
		$(_loadingResultsDivId).show();
		
		$(_resultsDivId).empty();
	}
	
	function onGetHotelRequestCompleted(eventArgs) 
	{	
		if (eventArgs.cancelled) {
			return;
		}

		afterRequestUpdateUI(eventArgs);
	}

	function getHotelWithSortSuccess(eventArgs) 
	{
		if (eventArgs.cancelled)
		{
			return;
		}
		
		afterRequestUpdateUI(eventArgs);
		
		toggleSortDirectionAttributeValue();
	}
	
	function afterRequestUpdateUI(eventArgs)
	{
		$(_loadingResultsDivId).hide();

		$(_resultsDivId).html(eventArgs.data);

		window.location.hash = "#ajaxresult";
		
		if ($('.lr-hotel-row', $(_resultsDivId)).length <= 0) 
		{
			$(_resultsDivId).hide();
			$("#reset").show();	
		}
		else
		{
			$(_resultsDivId).show();
			$("#reset").hide();	
		}

		$('a[rel=flyout]', $(_resultsDivId)).carouselflyout();

		showIndicatorsWhenMapShown();

		unbindEvents();

		bindEvents();
	}
	
	function toggleSortDirectionAttributeValue() 
	{
		var currentSortImage = $("img[sort-column='" + lr.SearchOptions.orderBy + "']", $(_resultsDivId));
		
		var newSortDirectionAttributeValue = lr.SearchOptions.sortDirection.toLowerCase() == "asc" ? "desc" : "asc";
		
		currentSortImage.attr("sort-direction", newSortDirectionAttributeValue);		
	}

	this.getPageNumber = function() 
	{
		return _pageNumber;
	};
};

lr.maps.views.hotelSearchView = lr.core.createClass();
lr.maps.views.hotelSearchView.prototype = function(searchOptions, markerDetails)
{
	var _searchOptions				= searchOptions;
	var _starRatingPanelView		= new lr.maps.views.starRatingPanelView();
	var _guestRatingPanelView		= new lr.maps.views.guestRatingPanelView();
	var _specialOffersView			= new lr.maps.views.specialOffersView();
	var _facilitiesPanelView		= new lr.maps.views.facilitiesPanelView();
	var _accommodationTypePanelView = new lr.maps.views.accommodationTypePanelView();
	var _resetFiltersPanelView		= new lr.maps.views.resetFiltersPanelView();
	var _googleMapView;
	var _distancePanelView;
	var _pricePanelView;
	var _hotelSearchListView;

	function createGoogleMapView() 
	{
		var templates		= new lr.templates.templateCollection();
		templates.addTemplate("HotelInformationBalloon", "hotel-information-balloon-template");	
		var templateEngine	= new lr.templates.templateEngine(templates);
		var mapSettings		= new lr.maps.mapSettings(window.mapCentre);
		
		_googleMapView = new lr.maps.views.googleMapView(markerDetails, mapSettings, templateEngine);
	}

	function createPricePanelView() 
	{
		var prefix = _searchOptions.prefix;
		var postfix = _searchOptions.postfix;
		var defaultMinPrice = _searchOptions.cheapestPrice;
		var defaultMaxPrice = _searchOptions.highestPrice;
		var selectedMinPrice = _searchOptions.selectedMinPrice;
		var selectedMaxPrice = _searchOptions.selectedMaxPrice;
		
		_pricePanelView = new lr.maps.views.pricePanelView(prefix, postfix, defaultMinPrice, defaultMaxPrice, selectedMinPrice, selectedMaxPrice);
	}

	function createDistancePanelView()
	{
		var mileRangeValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50];
		var kilometerRangeValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 40, 50, 60, 70, 80];
		var selectedRangeValue = _searchOptions.selectedMaxRadius;
		
		_distancePanelView = new lr.maps.views.distancePanelView(mileRangeValues, kilometerRangeValues, selectedRangeValue, true);		
	}
	
	function createHotelSearchListView() 
	{
		_hotelSearchListView = new lr.maps.views.hotelSearchListView(_searchOptions.pageNumber);
	}
	
	function init() 
	{
		createGoogleMapView();
		createPricePanelView();
		createDistancePanelView();
		createHotelSearchListView();
	}
	init();
	
	this.getHotelSearchListView = function() {
		return _hotelSearchListView;
	};
	
	this.getDistancePanelView = function() {
		return _distancePanelView;
	};

	this.getStarRatingPanelView = function() {
		return _starRatingPanelView;
	};

	this.getGuestRatingPanelView = function() {
		return _guestRatingPanelView;
	};

	this.getSpecialOffersView = function() {
		return _specialOffersView;
	};

	this.getPricePanelView = function() {
		return _pricePanelView;
	};

	this.getFacilitiesPanelView = function() {
		return _facilitiesPanelView;
	};

	this.getAccommodationTypePanelView = function() {
		return _accommodationTypePanelView;
	};

	this.getResetFiltersPanelView = function() {
		return _resetFiltersPanelView;
	};

	this.getGoogleMapView = function() {
		return _googleMapView;
	};
};

lr.maps.views.hotelDirectionFormView = lr.core.createClass();
lr.maps.views.hotelDirectionFormView.prototype = function(templateEngine, resources, hotel) {
    var _templateEngine = templateEngine;
    var _resources = resources;
    var _hotel = hotel;
    var _validator = lr.maps.hotelDirectionFormValidator;

    var _getDirectionsButtonId = "#get-directions-button";
    var _hotelLatitudeHiddenId = "#hotel-location-latitude";
    var _hotelLongitudeHiddenId = "#hotel-location-longitude";
    var _startAddressTextBoxId = "#direction-start-address-txt";
    var _toFromRadioSelector = "input[name=hotel-direction-to-from]";
    var _directionToHotelLabelId = "#direction-to-hotel-label";
    var _directionFromHotelLabelId = "#direction-from-hotel-label";
    var _directionToHotelRadioId = "#direction-to-hotel-rdo";

    function validateForm(address) {
        var isValid = _validator.validate(address);

        if (!isValid) {
            alert("Please specify a valid address.");
            return false;
        }

        return true;
    }

    function getDirectionsWithAddress(address) {        
        
        if (!validateForm(address)) {
            return;
        }

        var latitudeString = $(_hotelLatitudeHiddenId).val();
        var longitudeString = $(_hotelLongitudeHiddenId).val();
        var latitude = parseFloat(latitudeString);
        var longitude = parseFloat(longitudeString);
        var toOrFrom = $(_toFromRadioSelector + ":checked").val();
        var hotelLocation = lr.maps.LatLng({ latitude: latitude, longitude: longitude });
        var eventArgs;

        if (toOrFrom == "to") {
            eventArgs =
            {
                origin: hotelLocation,
                destination: address,
                travelMode: google.maps.TravelMode.DRIVING
            };
        }
        else {
            eventArgs =
            {
                origin: address,
                destination: hotelLocation,
                travelMode: google.maps.TravelMode.DRIVING
            };
        }

        lr.messageBus.publish("hotelDirectionForm_getDirectionsClick", eventArgs);

    }

    this.initialize = function() {


        $(_startAddressTextBoxId).watermark(_resources.startAddress);
        $(_directionToHotelRadioId).attr("checked", "checked");

        $(_getDirectionsButtonId).bind("click", onGetDirectionsClick);

        $("#direction-start-address-txt").keydown(function(event) {
            if (event.keyCode == 13) {
                event.preventDefault();
                event.stopPropagation();                
                $("#get-directions-button").click();                               
            }
        });



        $(_toFromRadioSelector).bind("click", onDirectionToFromRadioClick);
    };

    this.unbindEvents = function() {
        $(_getDirectionsButtonId).unbind();
        $(_toFromRadioSelector).unbind();
    };

    function onDirectionToFromRadioClick() {
        var toOrFrom = $(_toFromRadioSelector + ":checked").val();

        if (toOrFrom == "to") {
            styleFormForToAddress();
        }
        else {
            styleFormForFromAddress();
        }
    }

    function styleFormForToAddress() {
        $(_directionToHotelLabelId).css("font-weight", "bold");
        $(_directionFromHotelLabelId).css("font-weight", "normal");
        $(_startAddressTextBoxId).watermark(_resources.startAddress);
    }

    function styleFormForFromAddress() {
        $(_directionFromHotelLabelId).css("font-weight", "bold");
        $(_directionToHotelLabelId).css("font-weight", "normal");
        $(_startAddressTextBoxId).watermark(_resources.endAddress);
    }

    this.getFormAsHtml = function() {
        var resources = _resources;
        resources.hotelName = _hotel.name;
        resources.hotelLatitude = _hotel.latitude;
        resources.hotelLongitude = _hotel.longitude;

        return _templateEngine.getHtml("HotelDirectionForm", resources);
    };

    function init() {
        subscribeToMessages();
    }
    init();

    function subscribeToMessages() {
        lr.messageBus.subscribe("didYouMeanAddressView_addressItemClick", onDidYouMeanAddressItemClick);
    }

    function onGetDirectionsClick() {

        getDirectionsWithAddress($(_startAddressTextBoxId).val());
    }

    function onDidYouMeanAddressItemClick(addressLatLng) {
        getDirectionsWithAddress(addressLatLng);
    }
};

lr.maps.views.googleMapView = lr.core.createClass();
lr.maps.views.googleMapView.prototype = function(markerDetails, mapSettings, templateEngine) {
    var _self = this;
    var _mapDivId = "#mapHolder";
    var _mapLoadDivId = "#mapLoader";
    var _mapShowButtonId = "#mapShow";
    var _mapHideButtonId = "#mapHide";
    var _mapToggleLinkId = "#map-toggle-link";
    var _templateEngine = templateEngine;
    var _markerService = new lr.maps.hotelMarkerService();
    var _markerDetails = markerDetails;
    var _mapSettings = mapSettings;
    var _map, _markers, _dragStartPoint, _dragEndPoint, _hotelBalloon;

    this.getMapDiv = function() {
        return $(_mapDivId)[0];
    };

    function mapIsHidden() {
        return $(_mapDivId).css("display") === "none";
    }

    this.toggleMap = function(speed) {
        if (mapIsHidden()) {
            _self.showMap(speed);
        }
        else {
            _self.hideMap(speed);
        }
    };

    this.showMap = function() {
        $(_mapDivId).animate({ height: "show" }, function() {
            _self.showMapHideButton();
            _self.hideMapShowButton();
            $(".lr-map-indicator").show();
        });
    };

    this.hideMap = function() {

        $(_mapDivId).animate({ height: "hide" });

        $(".lr-map-indicator").hide();
        _self.hideMapHideButton();
        _self.showMapShowButton();

    };

    this.showMapLoad = function() {
        $(_mapLoadDivId).css("display", "inline");
    };

    this.hideMapLoad = function() {
        $(_mapLoadDivId).css("display", "none");
    };

    this.showMapShowButton = function() {
        $(_mapShowButtonId).css("display", "inline");
    };

    this.hideMapShowButton = function() {
        $(_mapShowButtonId).css("display", "none");
    };

    this.showMapHideButton = function() {
        $(_mapHideButtonId).css("display", "inline");
    };

    this.hideMapHideButton = function() {
        $(_mapHideButtonId).css("display", "none");
    };

    function unbindEvents() {
        $(_mapShowButtonId).unbind();
        $(_mapHideButtonId).unbind();
        $(_mapToggleLinkId).unbind();

        _map.clearInstanceListeners();
    }

    function bindEvents() {
        $(_mapShowButtonId).bind("click", _self.showMap);
        $(_mapHideButtonId).bind("click", _self.hideMap);
        // $(_mapToggleLinkId).bind("click", toggleMapDisplayAsSlow);

        _map.addListener("dragstart", onMapDragStart);
        _map.addListener("dragend", onMapDragEnd);
        _map.addListener("zoom_changed", onMapZoomChanged);
    };

    function toggleMapDisplayAsSlow() {
        _self.toggleMap("slow");
    };

    function onMapZoomChanged() {
        saveMapZoom();
        saveMapCentre();
        getHotelsWithMapBounds();
    };

    function onMapDragStart() {
        var center = _map.getCenter();

        _dragStartPoint = _map.fromLatLngToDivPixel(center);
    };

    function onMapDragEnd() {
        var center = _map.getCenter();

        _dragEndPoint = _map.fromLatLngToDivPixel(center);

        saveMapCentre();

        if (Math.abs(_dragStartPoint.x - _dragEndPoint.x) > 1 || Math.abs(_dragStartPoint.y - _dragEndPoint.y) > 1) {
            getHotelsWithMapBounds();
        }
    };

    this.getMap = function() {
        return _map.getMap();
    };

    function initialize() {
        _self.showMap();

        createMap();

        unbindEvents();

        bindEvents();

        paintMarkers();

        createHotelBalloon();

        subscribeToMessages();

        initializeCompleted();
    };
    initialize();

    function createHotelBalloon() {
        _hotelBalloon = new lr.maps.balloons.hotelInformationBalloon(_map, _templateEngine);
    };

    function paintMarkers() {
        _markers = _markerService.addMarkersToMap(_map, _markerDetails, onMarkerClick);
    };

    function onMarkerClick(evt) {
        var source = evt.srcElement || evt.target;
        var hotelRef = $(source).attr("ref");

        lr.serviceBus.getHotelService().getHotel(hotelRef, onMarkerClick_HotelRetrieved, onMarkerClick_HotelRetrievedError);
    };

    function onMarkerClick_HotelRetrieved(eventArgs) {
        if (!lr.core.nullOrUndefined(_hotelBalloon)) {
            _hotelBalloon.close();
            createHotelBalloon();
        }

        _hotelBalloon.open(eventArgs.data.d);
    };

    function onMarkerClick_HotelRetrievedError() {
        var message = "An error occurred attempting to retrieve the hotel details.";

        alert(message);
    };

    function initializeCompleted() {
        _self.hideMapLoad();
    };

    function createMap() {
        var mapDiv = _self.getMapDiv();
        var options = getMapOptions();

        _map = new lr.maps.Map(mapDiv, options);
    };

    function getMapCentre() {
        return lr.maps.LatLng(_mapSettings.getDefaultCenterPosition());
    }

    function getMapOptions() {
        var zoomLevel = getZoomLevel();
        var center = getMapCentre();

        var mapOptions =
        {
            center: center,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            zoom: zoomLevel,
            disableDoubleClickZoom: false
        };

        return mapOptions;
    };

    function getZoomLevel() {
        var zoomLevel = _mapSettings.getZoomLevel();

        if (!lr.core.string.isNullOrEmpty(zoomLevel)) {
            return parseInt(zoomLevel.trim());
        }

        return lr.SearchOptions.hasResults || lr.SearchOptions.DefaultMapZoomLevel ? 11 : 5;
    };

    function saveMapCentre() {
        var center = _map.getCenter();
        _mapSettings.setDefaultCenterPosition({ latitude: center.lat(), longitude: center.lng() });
    }

    function saveMapZoom() {
        _mapSettings.setZoomLevel(_map.getZoom());
    }

    function getHotelsWithMapBounds() {
        var bounds = _map.getBounds();
        var minimumLatitude = bounds.getSouthWest().lat();
        var minimumLongitude = bounds.getSouthWest().lng();
        var maximumLatitude = bounds.getNorthEast().lat();
        var maximumLongitude = bounds.getNorthEast().lng();

        lr.messageBus.publish("googleMapView_getHotelsWithMapBounds",
	    {
	        minimumLatitude: minimumLatitude,
	        minimumLongitude: minimumLongitude,
	        maximumLatitude: maximumLatitude,
	        maximumLongitude: maximumLongitude
	    });
    }

    function resetMarkers() {
        _markerService.removeAllFromMap(_markers);

        _markers = new Array();

        _markerDetails = window.markers;

        _markers = _markerService.addMarkersToMap(_map, _markerDetails, onMarkerClick);
    }

    function subscribeToMessages() {
        lr.messageBus.subscribe("GetHotelsWithSort", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithStarRating", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithGuestRating", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithSpecialOffers", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithFacilities", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithAccommodationType", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithPrice", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithRadius", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithAttraction", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("GetHotelsWithGeoBounds", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("ClearAllSearchFilters", onGetHotelRequestCompleted);
        lr.messageBus.subscribe("hotelSearchListView_onHotelIndicatorClick", onHotelIndicatorClick);
    }

    function onHotelIndicatorClick(data) {
        _self.showMap();

        scrollToMap();

        lr.serviceBus.getHotelService().getHotel(data.hotelReference, onMarkerClick_HotelRetrieved, onMarkerClick_HotelRetrievedError);
    }

    function scrollToMap() {
        if ($(document).scrollTop() > 250) {
            $("html, body").animate({ scrollTop: "0px" }, 500);
        }
    }

    function onGetHotelRequestCompleted(eventArgs) {
        if (eventArgs.cancelled) {
            return;
        }

        resetMarkers();
    }
};

lr.maps.hotelDirectionFormValidator =
{
	validate: function(address) {
		
		if (lr.core.object.isObject(address)) {
			return true;
		}
		
		if (lr.core.nullOrUndefined(address)) 
		{
			return false;
		}
		
		if (!lr.core.string.isString(address)) 
		{
			return false;
		}
		
		if (lr.core.string.isNullOrEmpty(address)) 
		{
			return false;
		}
		
		return true;
	}
};