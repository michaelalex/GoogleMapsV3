lr.controllers = {};

lr.controllers.mapAndDirectionsController = lr.core.createClass();
lr.controllers.mapAndDirectionsController.prototype = function(resources) 
{
	var _resources = resources;
	var _hotelMapAndDirectionView;
	var _hotelMapAndDirectionStepsView;
	var _didYouMeanView;
	
	function getTemplateEngine()
	{
        var templates = new lr.templates.templateCollection();
		
        templates.addTemplate("HotelInformationBalloon", "hotel-information-balloon-template");
        templates.addTemplate("HotelDirectionForm", "hotel-direction-tofrom-form-template");
        templates.addTemplate("HotelDirectionSteps", "hotel-direction-steps-template");
        templates.addTemplate("DidYouMeanTemplate", "hotel-directions-did-you-mean-template");

		return new lr.templates.templateEngine(templates);
	}
	
	function registerViews() 
	{
		var templateEngine = getTemplateEngine();
		
        var viewData =
        {
            mapDivId: "google-map-container",
            showOnMapLinkId: "show-on-map-link",
            getDetailedDirectionsLinkId: "get-detailed-directions-link",
            resources: _resources.strings,
            hotel: _resources.hotel
        };
        
        _hotelMapAndDirectionView = new lr.maps.views.hotelMapAndDirectionView(templateEngine, viewData);
        _hotelMapAndDirectionStepsView = new lr.maps.views.hotelMapAndDirectionStepsView(templateEngine, "gDirections");
        _didYouMeanView = new lr.maps.views.didYouMeanAddressView(templateEngine, _resources, "gDidYouMean");
    }
	
	function init()
	{
		registerViews();
	}
	init();	
};

lr.controllers.hotelSearchController = lr.core.createClass();
lr.controllers.hotelSearchController.prototype = function(resultType, partnerId, markers, httpRoutes) 
{
	lr.serviceBus = lr.serviceBus || new lr.services.serviceBus(httpRoutes);
	
	var _searchOptions	= lr.SearchOptions;
	var _resultType		= resultType;
	var _showMapOnLoad	= true;
	var _partnerId		= partnerId;
	var _markers		= markers;
	var _errorMessage	= "An error occurred while attempting to retrieve the hotels.";
	var _googleAnalyticsService = lr.serviceBus.getGoogleAnalyticsService();
	var _view;
	
	function beforeRequest() 
	{
		lr.messageBus.publish("hotelSearchController_beforeGetHotelsRequest");
	}
	
	function handleHotelFilterRequestSuccess(eventArgs) 
	{
		lr.serviceBus.getSearchService().updateAllCounters(_partnerId, null, handleRequestError);
	}

	function onHotelSearchListSortClick(sortData) 
	{
		var sortColumn	  = sortData.sortColumn;
		var sortDirection = sortData.sortDirection;

		beforeRequest();
		
		_googleAnalyticsService.SortOrderChanged("Click", sortColumn + " " + sortDirection);
		
		lr.serviceBus.getHotelService().getHotelsWithSort(sortColumn, sortDirection, _resultType, _showMapOnLoad, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function onStarRatingClick(starRatingInfoAsJson) 
	{
		beforeRequest();

		var starRating		= starRatingInfoAsJson.starRating;
		var starRatingArray = starRatingInfoAsJson.checkedRatings;
		
		_googleAnalyticsService.MultiChoiceFilterOptionChecked("Checked", starRating.value + " starRatings", starRating.isChecked);
		
		lr.serviceBus.getHotelService().getHotelsWithStarRating(starRatingArray, _resultType, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function onGuestRatingClick(guestRatingInfoAsJson) 
	{
		beforeRequest();

		var guestRating		 = guestRatingInfoAsJson.guestRating;
		var guestRatingArray = guestRatingInfoAsJson.checkedGuestRatings;
		
		_googleAnalyticsService.MultiChoiceFilterOptionChecked("Checked", guestRating.value + " guestRatings", guestRating.isChecked);
		
		lr.serviceBus.getHotelService().getHotelsWithGuestRating(guestRatingArray, _resultType, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function onSpecialOffersClick(specialOfferHotelsOnly) 
	{
		beforeRequest();

		_googleAnalyticsService.SpecialOfferFilterChanged("Click", specialOfferHotelsOnly);
		
		lr.serviceBus.getHotelService().getHotelsWithSpecialOffers(specialOfferHotelsOnly, _resultType, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function onAccommodationTypeClick(accommodationTypeInfoAsJson) 
	{
		beforeRequest();

		var accommodationType		 = accommodationTypeInfoAsJson.accommodationType;
		var accommodationTypeIdArray = accommodationTypeInfoAsJson.checkedAccommodationTypes;

		_googleAnalyticsService.MultiChoiceFilterOptionChecked("Checked", accommodationType.value + " accTypes", accommodationType.isChecked);
		
		lr.serviceBus.getHotelService().getHotelsWithAccommodationType(accommodationTypeIdArray, _resultType, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function onCurrencySelectChange(currencyDataAsJson) 
	{
		var currencyCode = currencyDataAsJson.currency;
		
		beforeRequest();
		
		_googleAnalyticsService.CurrencyChanged("Selected", currencyCode);
		
		lr.serviceBus.getSearchService().changeCurrency(_searchOptions.language, _partnerId, currencyCode, handleCurrencySelectChangeSuccess, handleRequestError);
	}
	
	function handleCurrencySelectChangeSuccess()
	{
		window.location.reload(true);
	}
	
	function onFacilitiesClick(facilityInfoAsJson) 
	{
		beforeRequest();

		var facility			= facilityInfoAsJson.facility;
		var checkedFacilities	= facilityInfoAsJson.checkedFacilities;
		
		_googleAnalyticsService.MultiChoiceFilterOptionChecked(facility.name.trim() + " facilities", "Checked", facility.isChecked);
		
		var hotelSearchListView = _view.getHotelSearchListView();

		var pageNumber = hotelSearchListView.getPageNumber();

		lr.serviceBus.getHotelService().getHotelsWithFacilities(checkedFacilities, _resultType, pageNumber, handleHotelFilterRequestSuccess, handleRequestError);
	}

	function registerView() 
	{
		_view = new lr.maps.views.hotelSearchView(_searchOptions, _markers);
	}
	
	function subscribeToMessages() 
	{
		lr.messageBus.subscribe("starRatingPanelView_onStarRatingClick", onStarRatingClick);
		lr.messageBus.subscribe("googleMapView_getHotelsWithMapBounds", getHotelsWithMapBounds);
		lr.messageBus.subscribe("resetFiltersPanelView_onResetClick", onResetFilters);
		lr.messageBus.subscribe("facilitiesPanelView_onFacilitiesClick", onFacilitiesClick);
		lr.messageBus.subscribe("guestRatingPanelView_onGuestRatingClick", onGuestRatingClick);
		lr.messageBus.subscribe("specialOffersView_onSpecialOffersClick", onSpecialOffersClick);
		lr.messageBus.subscribe("pricePanelView_onCurrencySelectChange", onCurrencySelectChange);
		lr.messageBus.subscribe("hotelSearchListView_onHeaderSortClick", onHotelSearchListSortClick);
		lr.messageBus.subscribe("accommodationTypePanelView_onAccommodationTypeClick", onAccommodationTypeClick);
		lr.messageBus.subscribe("radiusSlider_onSliderStop", onDistanceSliderChange);
		lr.messageBus.subscribe("pricePanelView_onSliderStop", onPriceRangeSliderChange);
	}
	
	function onPriceRangeSliderChange(priceData) 
	{
		var minimumPrice = priceData.minPrice;
		var maximumPrice = priceData.maxPrice;

		beforeRequest();

		_googleAnalyticsService.PriceFilterRangeChanged("Selected", $("#currencies").val() + maximumPrice);

		lr.serviceBus.getHotelService().getHotelsWithPrice(minimumPrice, maximumPrice, _resultType, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function onDistanceSliderChange(radiusData)
	{
		var maxRadius		= radiusData.maxRadius;
		var radiusUnit		= radiusData.radiusUnit;
		var shortRadiusUnit = radiusUnit.toLowerCase() === "miles" ? "m" : "km";

		beforeRequest();

		_googleAnalyticsService.RadiusFilterDistanceChanged("Selected", shortRadiusUnit);

		lr.serviceBus.getHotelService().getHotelsWithRadius(maxRadius, radiusUnit, _resultType, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function onResetFilters() 
	{
		beforeRequest();
		
		resetViews();

		_googleAnalyticsService.SearchFiltersReset("Click");
		
		lr.serviceBus.getSearchService().clearAllSearchFilters(_resultType, 1, null, null, null, null, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function getHotelsWithMapBounds(bounds) 
	{
		beforeRequest();
		
		lr.serviceBus.getHotelService().getHotelsWithGeoBounds(bounds.minimumLatitude, bounds.minimumLongitude, bounds.maximumLatitude, bounds.maximumLongitude, _resultType, handleHotelFilterRequestSuccess, handleRequestError);
	}
	
	function handleRequestError() 
	{
		alert(_errorMessage);
	}
	
	function init() 
	{
		subscribeToMessages();

		registerView();

		lr.serviceBus.getSearchService().updateAllCounters(_partnerId);
	}
	init();
	
	function resetViews()
	{
		_view.getPricePanelView().resetForm();
		_view.getSpecialOffersView().resetForm();
		_view.getStarRatingPanelView().resetForm();
		_view.getFacilitiesPanelView().resetForm();
		_view.getGuestRatingPanelView().resetForm();
		_view.getAccommodationTypePanelView().resetForm();
		_view.getDistancePanelView().resetForm();
	}
};