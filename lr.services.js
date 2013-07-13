lr.services = {};

lr.services.serviceBus = lr.core.createClass();
lr.services.serviceBus.prototype = function(routes)
{
	var _requestHandler			= new lr.http.requestHandler(routes);
	var _hotelService			= new lr.services.hotelService(_requestHandler);
	var _searchService			= new lr.services.searchService(_requestHandler);
	var _googleAnalyticsService = new lr.services.googleAnalyticsService();

	this.getGoogleAnalyticsService = function()
	{
		return _googleAnalyticsService;		
	};

	this.getHotelService = function() 
	{
		return _hotelService;
	};
	
	this.getSearchService = function() 
	{
		return _searchService;
	};
};

lr.services.searchService = lr.core.createClass();
lr.services.searchService.prototype = function(requestHandler) 
{
	var _requestHandler = requestHandler;

	this.changeCurrency = function(language, partnerId, currencyCode, successCallback, errorCallback) 
	{
		var data = JSON.stringify(
		{
			language: language,
			currencyCode: currencyCode,
			partnerId: partnerId
		});

		_requestHandler.queueRequest("CurrencyChange", data, successCallback, errorCallback);		
	};
	
	this.clearAllSearchFilters = function(resultType, pageNumber, minPrice, maxPrice, minRadius, maxRadius, successCallback, errorCallback)
	{
		var data = 
		{
			resultType: resultType, 
			page: pageNumber,
			minPrice: minPrice,
			maxPrice: maxPrice,
			minRadius: minRadius,
			maxRadius: maxRadius
		};

		_requestHandler.queueRequest("ClearAllSearchFilters", data, successCallback, errorCallback);
	};

	this.refreshFilters = function(resultType, successCallback, errorCallback) 
	{
		var data =
		{
			resultType: resultType
		};

		_requestHandler.queueRequest("RefreshFilters", data, successCallback, errorCallback);
	};
	
	this.updateAllCounters = function(partnerId, successCallback, errorCallback)
	{
		_requestHandler.queueRequest("UpdateAllCounters", { partnerId: partnerId }, successCallback, errorCallback);
	};

	this.toString = function() 
	{
		return "[Object lr.services.searchService]";
	};
};

lr.services.hotelService = lr.core.createClass();
lr.services.hotelService.prototype = function(requestHandler) 
{
	var _requestHandler = requestHandler;

	this.getHotel = function(hotelReference, successCallback, errorCallback) 
	{
		var data = JSON.stringify({ hotelRef: hotelReference });
		
		_requestHandler.queueRequest("GetHotel", data, successCallback, errorCallback);
	};

	this.getHotelsWithGeoBounds = function(minimumLatitude, minimumLongitude, maximumLatitude, maximumLongitude, resultType, successCallback, errorCallback) 
	{
		var data = JSON.stringify(
		{
			 minLatitude: minimumLatitude,
			 minLongitude: minimumLongitude,
			 maxLatitude: maximumLatitude, 
			 maxLongitude: maximumLongitude, 
			 resultType: resultType
		});

		_requestHandler.queueRequest("GetHotelsWithGeoBounds", data, successCallback, errorCallback);
	};

	this.getHotelsWithSort = function(sortColumn, sortDirection, resultType, showMapOnLoad, successCallback, errorCallback) 
	{
		var data = JSON.stringify(
		{
			orderBy: sortColumn,
			sortOrder: sortDirection,
			resultType: resultType,
			map: showMapOnLoad
		});

		_requestHandler.queueRequest("GetHotelsWithSort", data, successCallback, errorCallback);
	};
	
	this.getHotelsWithGuestRating = function(guestRatingArray, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			guestRatings: guestRatingArray.join(","),
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsWithGuestRating", data, successCallback, errorCallback);
	};

	this.getHotelsWithStarRating = function(starRatingArray, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			starRatings: starRatingArray.join(","),
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsWithStarRating", data, successCallback, errorCallback);
	};

	this.getHotelsWithFacilities = function(facilityIdArray, resultType, pageNumber, successCallback, errorCallback) 
	{
		var data =
		{
			facilities: facilityIdArray.join(","),
			resultType: resultType,
			page: pageNumber
		};
		
		_requestHandler.queueRequest("GetHotelsWithFacilities", data, successCallback, errorCallback);
	};

	this.getHotelsWithAccommodationType = function(accommodationTypeIdArray, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			accTypes: accommodationTypeIdArray.join(","),
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsWithAccommodationType", data, successCallback, errorCallback);
	};

	this.getHotelsWithPrice = function(minPrice, maxPrice, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			minPrice: minPrice,
			maxPrice: maxPrice,
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsWithPrice", data, successCallback, errorCallback);
	};

	this.getHotelsWithRadius = function(maxRadius, radiusUnit, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			maxRadius: maxRadius,
			radiusUnit: radiusUnit,
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsWithRadius", data, successCallback, errorCallback);
	};

	this.getHotelsWithAttraction = function(attractionKeywordId, attractionName, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			attractionKeywordId: attractionKeywordId,
			attraction: attractionName,
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsWithAttraction", data, successCallback, errorCallback);
	};

	this.getHotelsWithGeocode = function(latitude, longitude, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			latitude: latitude,
			longitude: longitude,
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsByGeocode", data, successCallback, errorCallback);
	};

	this.getHotelsWithSpecialOffers = function(specialOfferHotelsOnly, resultType, successCallback, errorCallback) 
	{
		var data =
		{
			offerSearch: specialOfferHotelsOnly,
			resultType: resultType
		};

		_requestHandler.queueRequest("GetHotelsWithSpecialOffers", data, successCallback, errorCallback);
	};
	
	this.toString = function() 
	{
		return "[Object lr.services.hotelService]";
	};
};


$.trackEvent = function(category, action, label, value) {
    //fake track event in case we need it in the future
};
    


lr.services.googleAnalyticsService = lr.core.createClass();
lr.services.googleAnalyticsService.prototype = function() {
    
    
    this.SearchFiltersReset = function(eventType) {
        $.trackEvent('Reset Filters', eventType, '');
    };

    this.CurrencyChanged = function(eventType, currency) {
        $.trackEvent('Currency selector', eventType, currency);
    };

    this.FilterExpanded = function(event, data) {
        $.trackEvent('Show more filters', data.eventType, '');
    };

    this.FilterCollapsed = function(event, data) {
        $.trackEvent('Show less filters', data.eventType, '');
    };

    this.MultiChoiceFilterOptionChecked = function(label, eventType, value) {
        $.trackEvent(label, eventType, value);
    };

    this.PriceFilterRangeChanged = function(eventType, currencyTypeAndValue) {
        $.trackEvent('Price Slider', eventType, currencyTypeAndValue);
    };

    this.RadiusFilterDistanceChanged = function(eventType, distanceAndUnit) {
        $.trackEvent('Distance Unit Selector', eventType, distanceAndUnit);
    };

    this.RadiusFilterRangeChanged = function(event, data) {
        $.trackEvent('Distance Unit Selector', data.eventType, data.value);
    };

    this.SortOrderChanged = function(event, data) {
        $.trackEvent('Order by', data.eventType, data.value);
    };

    this.AccommodationTypeFilterChanged = function(event, data) {
        $.trackEvent('Accommodation Type', data.eventType, data.value);
    };

    this.SpecialOfferFilterChanged = function(event, data) {
        $.trackEvent('Special Offer', data.eventType, data.value);
    };

    this.DistrictAttractionFilterChanged = function(event, data) {
        $.trackEvent('District/Attraction', data.eventType, data.value);
    };

    this.toString = function() {
        return "[Object lr.services.googleAnalyticsService]";
    };
};