/// <reference path="../handlebars-1.0.0.js" />
(function ()
{
	"use strict";
	
	var lr = window.lr = window.laterooms = window.laterooms || {};

	lr.SearchOptions = lr.SearchOptions || {};

	lr.core = 
	{
		createClass: function() 
		{
			return function() 
			{
				this.prototype.constructor.apply(this, arguments);
			};
		},
		
		object:
		{
			isObject: function(value) {
				return Object.prototype.toString.call(value) === "[object Object]";
			},
			
			isEmptyObject: function(value) 
			{
				return $.isEmptyObject(value);
			}
		},
		
		nullOrUndefined: function(value) 
		{
			return value === null || value === undefined;
		},
		
		array: 
		{
			isArray: function(value)
			{
				return $.isArray(value);
			},
	        
			isNotArray: function(value)
			{
				return !$.isArray(value);
			},
	        
			isEmptyArray: function(value)
			{
				return $.isArray(value) && value.length === 0;
			},
	        
			isNonEmptyArray: function(value) 
			{
				return $.isArray(value) && value.length > 0;
			}
		},
	    
		number:
		{
			isNumber: function(value)
			{
				return Object.prototype.toString.call(value) === "[object Number]";
			}
		},
		
		___guid: 0,
		
		guid: function() 
		{
			return ++lr.core.___guid;
		},
	    
		string: 
		{
			format: function(value, array)
			{
				if (lr.core.array.isNotArray(array))
				{
					return value;
				}
				
				for (var index = 0, numberOfItems = array.length; index < numberOfItems; index++)
				{
					while(value.indexOf("{" + index + "}") !== -1)
					{
						value = value.replace("{" + index + "}", array[index]);	
					}
				}
				
				return value;
			},
	    
			formatWithJson: function(value, context)
			{
				var template = Handlebars.compile(value);
	            
				return template(context);            
			},
	        
			isString: function(value) 
			{
				return Object.prototype.toString.call(value) === "[object String]";
			},
			
			isNonEmpty: function(value)
			{
				if (!lr.core.string.isString(value)) 
				{
					throw new Error("value is not a valid string.");
				}
	            
				if (lr.core.string.removeAllWhitespace(value).length === 0) 
				{
					return false;
				}
	            
				return true;
			},
			
			removeAllWhitespace: function(value) 
			{
				return value.replace(/\W+/g, "");
			},
			
			isNullOrEmpty: function(value)
			{
				if (lr.core.nullOrUndefined(value))
				{
					return true;
				}

				if (lr.core.string.removeAllWhitespace(value).length === 0) 
				{
					return true;
				}
		        
				return false;
			}
		},
		
		dom:
		{
			createElement: function(tagName, text, attributes)
			{
				if (lr.core.string.isNullOrEmpty(tagName))
				{
					throw new Error("tagName cannot be null or empty.");
				}
		        
				var element = document.createElement(tagName);
		        
				$(element).html(text);
		        
				for (var attribute in attributes) 
				{
					element.setAttribute(attribute, attributes[attribute]);
				}
		        
				return element;
			}
		},
		
		assertor:
		{	
			stringExists: function(value, message) 
			{
				if (!lr.core.string.isString(value) || lr.core.string.isNullOrEmpty(value)) 
				{
					throw new lr.argumentError(message);
				}
			}
		}
	};

	lr.argumentError = lr.core.createClass();
	lr.argumentError.prototype = function(message) 
	{
		this.message = message;
	};

	lr.messaging = {};
	lr.messaging.messageBus = lr.core.createClass();
	lr.messaging.messageBus.prototype = function() 
	{
		var _self = this;
		var _messages = [];

		this.publish = function(eventName, data)
		{
			if (!_messages.hasOwnProperty(eventName)) {
				return;
			}

			var functions = _messages[eventName];

			if (!lr.core.array.isArray(functions) || lr.core.array.isEmptyArray(functions)) 
			{
				return;
			}

			for (var index = 0, numberOfFunctions = functions.length; index < numberOfFunctions; index++) 
			{
				functions[index].call(_self, data);
			}
		};

		this.subscribe = function(eventName, handler, indexOfHandler) 
		{
			if (lr.core.nullOrUndefined(_messages[eventName]))
			{
				_messages[eventName] = [];
			}
		    
			for (var index = 0, handlerLength = _messages[eventName].length; index < handlerLength; index++) 
			{
				if (_messages[eventName][index].toString() === handler.toString()) {
					return;
				}
			}
		    
			if (lr.core.number.isNumber(indexOfHandler) && _messages[eventName].length > 0)
			{
				_messages[eventName].splice(indexOfHandler, 0, handler);
			}
			else
			{
				_messages[eventName].push(handler);
			}
		};

		this.unsubscribe = function(eventName, handler) 
		{
			if (_messages !== null && lr.core.array.isNonEmptyArray(_messages[eventName])) 
			{	
				for (var index = 0, handlerLength = _messages[eventName].length; index < handlerLength; index++)
				{
					if (_messages[eventName][index].toString() === handler.toString()) 
					{
						_messages[eventName].splice(index, 1);
						break;
					}
				}
			}
		};
	};

	lr.messageBus = new lr.messaging.messageBus();

	lr.stringWriter = lr.core.createClass();
	lr.stringWriter.prototype = function ()
	{
		var _string = "";

		this.clear = function() {
			_string = "";
		};

		this.write = function (string)
		{
			if (string === null) 
			{
				throw new Error("string value cannot be null.");
			}
		    
			_string += string;
		};

		this.getString = function ()
		{
			return _string;
		};
	};

	lr.templates = {};

	lr.templates.template = lr.core.createClass();
	lr.templates.template.prototype = function(templateName, scriptId) 
	{
		this.templateName = templateName;
		this.scriptId     = scriptId;

		this.toString = function() 
		{
			return "[Object lr.templates.template]";
		};
	};

	lr.templates.templateCollection = lr.core.createClass();
	lr.templates.templateCollection.prototype = function() 
	{
		var templateArray = [];
		
		this.addTemplate = function(templateName, scriptId) 
		{
			if (!lr.core.string.isString(templateName) || lr.core.string.isNullOrEmpty(templateName)) {
				throw new Error("templateName must be specified.");
			}
			
			if (!lr.core.string.isString(scriptId) || lr.core.string.isNullOrEmpty(scriptId)) {
				throw new Error("scriptId must be specified.");
			}
			
			templateArray.push(new lr.templates.template(templateName, scriptId));
		};

		this.size = function() 
		{
			return templateArray.length;
		};

		this.getTemplate = function(templateName) 
		{	
			for (var index = 0, numberOfTemplates = templateArray.length; index < numberOfTemplates; index++) 
			{	
				if (templateArray[index].templateName === templateName) 
				{
					return templateArray[index];
				}
			}

			throw new Error("Template does not exist.");
		};
	};

	lr.templates.templateReader = lr.core.createClass();
	lr.templates.templateReader.prototype = function() 
	{
		this.getHtml = function(template, context) 
		{
			if (lr.core.nullOrUndefined(template) || template.toString() !== "[Object lr.templates.template]") 
			{
				throw new TypeError("template must be specified.");
			}
		    
			var html = $("#" + template.scriptId).html();

			if (context !== null)
			{
				html = lr.core.string.formatWithJson(html, context);
			}

			return html;
		};
	};

	lr.templates.templateEngine = lr.core.createClass();
	lr.templates.templateEngine.prototype = function(templateCollection) 
	{
		var _templateCollection = templateCollection;
		var _templateReader		= new lr.templates.templateReader();

		this.getHtml = function(templateName, context) 
		{
			if (templateName === null) 
			{
				throw new lr.argumentError("templateName must be specified.");
			}
		    
			var template = _templateCollection.getTemplate(templateName);
			
			return _templateReader.getHtml(template, context);
		};
	};


	lr.http = {};

	lr.http.requestHandler = lr.core.createClass();
	lr.http.requestHandler.prototype = function(routeDictionary) 
	{
		var _requestQueue		= new lr.http.requestQueue();
		var _routeDictionary	= routeDictionary;
		var _responseHandler	= new lr.http.responseHandler();
		var _currentRequest;
	    
		this.queueRequest = function(routeName, data, successCallback, errorCallback) {
		    
			if (!lr.core.nullOrUndefined(_currentRequest) && _currentRequest.requestName === routeName) 
			{
				_responseHandler.handle(_currentRequest, { cancelled: true });
				
				_currentRequest.abort();
				_currentRequest = null;
			}

			var route	= _routeDictionary[routeName];
			var state	= { successFn: successCallback, errorFn: errorCallback };
			var request = new lr.http.request(routeName, route.url, route.type, data, route.datatype, success, error, state);
			
			_requestQueue.queue(request);

			if (_requestQueue.qsize() === 1) {
				beginRequest();
			}
		};

		function success(sender, eventArgs)
		{
			if (lr.core.nullOrUndefined(eventArgs) || lr.core.nullOrUndefined(eventArgs.state))
			{
				return;
			}

			if (eventArgs.jqXHR.status === 200)
			{
    			handleSuccess(sender, eventArgs);
			}
			
			_currentRequest = null;
			beginRequest();
		}
	    
		function handleSuccess(sender, eventArgs) 
		{
			if ($.isFunction(eventArgs.state.successFn)) 
			{
				eventArgs.state.successFn(eventArgs);
			}
			
			_responseHandler.handle(sender, eventArgs);
		}
	    
		function error(sender, eventArgs) 
		{
			if (lr.core.nullOrUndefined(eventArgs) && eventArgs.state !== null && $.isFunction(eventArgs.state.errorFn)) 
			{
				eventArgs.state.errorFn(eventArgs);
			}
	        
			_responseHandler.handle(sender, eventArgs);
			_currentRequest = null;
	        
			beginRequest();
		}
	    
		function beginRequest() 
		{
			if (_requestQueue.isEmpty()) 
			{
				return;
			}

			_currentRequest = _requestQueue.dequeue();

			_currentRequest.execute();
		}
	};

	lr.http.request = lr.core.createClass();
	lr.http.request.prototype = function(requestName, url, method, data, datatype, successCallback, errorCallback, state) 
	{
		lr.core.assertor.stringExists(requestName, "requestName must be specified.");
		lr.core.assertor.stringExists(url, "url must be specified.");
		lr.core.assertor.stringExists(method, "method must be specified");
		
		var _jqXHR;
		var _self       = this;
		var _url		= url;
		var _method		= method;
		var _data		= data;
		var _dataType	= datatype;
		var _success	= successCallback;
		var _error		= errorCallback;
		var _state		= state;
		this.requestName = requestName;
		var _urlFactory	 = new lr.http.urlFactory();

		this.abort = function() 
		{
			if (_jqXHR === null) 
			{
				return;
			}
			
			_jqXHR.abort();
		};

		this.execute = function() 
		{
			var contentType;
			if (_dataType === "json") 
			{
				var data = _data; 
				
				if (lr.core.string.isString(data)) 
				{
					data = JSON.parse(data);
				}
				
				_url = _urlFactory.createUrl(_url, data);
				
				contentType = "application/json; charset=utf-8";
			}
			else if (_dataType === "html") 
			{
				var data = _data; 
				
				if (lr.core.string.isString(data)) 
				{
					data = JSON.parse(data);
				}
				
				_url = _urlFactory.createUrl(_url, data);
				
				contentType = "text/html; charset=utf-8";
			} 
			else 
			{
				contentType = "application/x-www-form-urlencoded; charset=UTF-8";
			}
				
			_jqXHR = $.ajax(
			{
				type:           _method,
				contentType:    contentType,
				url:            _url,
				data:           _data,
				dataType:       _dataType,
				success:        success,
				error:          error            
			});
		};

		function success(data, textStatus, jqXHR) 
		{
			if ($.isFunction(_success)) 
			{
				_success.apply(this, [_self, { data: data, textStatus: textStatus, jqXHR: jqXHR, state: _state }]);
			}
		};

		function error(jqXHR, textStatus, errorThrown) 
		{
			if ($.isFunction(_error)) 
			{
				_error.apply(this, [_self, { jqXHR: jqXHR, textStatus: textStatus, errorThrown: errorThrown, state: _state }]);
			}
		};

		this.toString = function() 
		{
			return "[Object lr.http.request]";
		};
	};

	lr.http.requestQueue = lr.core.createClass();
	lr.http.requestQueue.prototype = function() 
	{
		var requestQueue = new Array();
			
		this.queue = function(request) 
		{
			if (lr.core.nullOrUndefined(request) || request.toString() !== "[Object lr.http.request]") {
				throw new Error("request is not a valid lr.http.request object.");
			}
		    
			requestQueue.push(request);
		};

		this.dequeue = function() 
		{
			return requestQueue.length > 0 ? requestQueue.splice(0, 1)[0] : null;
		};

		this.isEmpty = function() 
		{
			return requestQueue.length === 0;
		};
	    
		this.qsize = function() 
		{
			return requestQueue.length;
		};
	};

	lr.http.route = lr.core.createClass();
	lr.http.route.prototype = function(url, type, datatype) 
	{
		this.url        = url;
		this.type       = type;
		this.datatype   = datatype;
	};

	lr.http.responseHandler = lr.core.createClass();
	lr.http.responseHandler.prototype = function() 
	{
		this.handle = function(request, eventArgs) 
		{
			if (lr.core.nullOrUndefined(request) || request.toString() !== "[Object lr.http.request]") 
			{
				throw new lr.argumentError("request is not a valid lr.http.request object.");
			}
		    
			lr.messageBus.publish(request.requestName, eventArgs);
		};
	};

	lr.http.cookie =
	{
		createCookie: function(name, value, expiryInDays, path) {
			$.cookie(name, value, { expires: expiryInDays, path: path || "/" });
		},

		getCookie: function(name) {
			return $.cookie(name) || "";
		},

		deleteCookie: function(name, path) {
			$.cookie(name, null, { path: path || "/" });
		}
	};

	lr.http.urlFactory = lr.core.createClass();
	lr.http.urlFactory.prototype = function() 
	{
		this.createUrl = function(url, queryStringDataAsJson) 
		{
			if (lr.core.nullOrUndefined(url) || lr.core.string.isNullOrEmpty(url)) 
			{
				return "";
			}
			
			if (lr.core.nullOrUndefined(queryStringDataAsJson)) 
			{
				return url;
			}

			if (!lr.core.object.isObject(queryStringDataAsJson) || lr.core.object.isEmptyObject(queryStringDataAsJson))
			{
				return url;
			}

			var _url	= url;
			var _data	= queryStringDataAsJson;
			
			if (_url.indexOf("?") === -1) {
				_url += "?";
			}
			
			for (var item in _data) {
				_url += item + "=" + encodeURIComponent(_data[item]) + "&";
			}
			
			if (_url[_url.length - 1] !== "&")
			{
				_url += "&";
			}
			
			_url += getRandomValue();

			return _url;
		};
		
		function getRandomValue()
		{
			return lr.core.guid();
		}
	};

	String.prototype.trim = function() { return this.replace(/^\s+|\s+$/g,""); };
	String.prototype.trimEnd = function() { return this.replace(/\s+$/, ''); };
	String.prototype.trimStart = function() { return this.replace(/^\s+/, ''); };
	String.prototype.startsWith = function(str) { return this.indexOf(str) === 0; };
})();