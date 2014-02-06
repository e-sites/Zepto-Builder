define([
	'zepto',
	'DownloadBuilder',
	'uglify',
	'keymaster',
	'spin'
], function(Zepto, DownloadBuilder, UglifyJS, key, Spinner) {

	'use strict';

	// Cached Zepto sets
	var $ = (window.jQuery ? jQuery : Zepto),
		$body = $('body'),
		$source = $('#source'),
		$modules = $('#modules'),
		$generateBtn = $('#btn-generate'),
		$saveBtn = $('#btn-save'),

		// Feature detect + local reference
		// Courtesy of Mathias Bynens
		// http://mathiasbynens.be/notes/localstorage-pattern
		sessionStorage = (function() {
			/*jshint eqeqeq:false */
			var uid = new Date(),
				storage,
				result;

			try {
				(storage = window.sessionStorage).setItem(uid, uid);
				result = storage.getItem(uid) == uid;
				storage.removeItem(uid);
				return result && storage;
			} catch(e) {}
		}()),

		// Loading indicator
		spinner = new Spinner({
			lines: 15,
			length: 3,
			width: 2,
			radius: 9,
			corners: 1,
			rotate: 0,
			direction: 1,
			color: '#4CA1E4',
			speed: 1,
			trail: 60,
			shadow: false,
			hwaccel: true,
			className: 'spinner',
			zIndex: 2e9,
			top: '-28px',
			left: '110px'
		}),

		// Some static stuff
		/*jshint camelcase:false */
		CONFIG = {
			'location': 'github',
			'author': 'madrobby',
			'repo': 'zepto',
			'branch': 'master',
			'client_id': '',
			'client_secret': ''
		},
		FILE_NAME = 'zepto.js',
		MIN_FILE_NAME = FILE_NAME.replace('.', '.min.'),
		MODULE_METADATA_PATH = 'assets/json/modules.json',
		API_URL = 'https://api.github.com',
		REPO_PATH = '/repos/madrobby/zepto/contents',
		TOP_COMMENT = '// Zepto %i (generated with Zepto Builder) - %s - zeptojs.com/license \n',
		SRC_PATH = '/src',
		AUTH_QRYSTR = (CONFIG.client_id ? '?client_id=' + CONFIG.client_id + '&client_secret=' + CONFIG.client_secret : '');

	/**
	 * Small bytesToSize helper (courtesy of Stephen Cronin)
	 * @see http://scratch99.com/web-development/javascript/convert-bytes-to-mb-kb/
	 * @param  {Number} bytes
	 * @return {Number}
	 * @private
	 */
	function _bytesToSize(bytes) {
		var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'],
			i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));

		if ( i === 0 ) {
			return bytes + ' ' + sizes[i];
		}

		return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
	}

	/**
	 * Namespace that encapsulates all ZB related logic
	 * 
	 * @type {Object}
	 */
	var ZB = {

		/**
		 * Minify wrapper that leverages Uglify
		 * Based on https://gist.github.com/jpillora/5652641
		 * 
		 * @param  {String} codes
		 * @param  {Object} options
		 * @return {String} minified output
		 * @private
		 */
		_minify: function (codes, options) {
			/*jshint camelcase:false */

			var toplevel = null,
				compress, sq, stream;

			options = UglifyJS.defaults(options || {}, {
				warnings: false,
				mangle: {},
				compress: {}
			});

			if ( typeof codes === 'string' ) {
				codes = [codes];
			}

			$.each(codes, function (index, code) {
				toplevel = UglifyJS.parse(code, {
					filename: '?',
					toplevel: toplevel
				});
			});

			if ( options.compress ) {
				compress = {
					warnings: options.warnings
				};
				UglifyJS.merge(compress, options.compress);
				toplevel.figure_out_scope();
				sq = UglifyJS.Compressor(compress);
				toplevel = toplevel.transform(sq);
			}

			if ( options.mangle ) {
				toplevel.figure_out_scope();
				toplevel.compute_char_frequency();
				toplevel.mangle_names(options.mangle);
			}

			stream = UglifyJS.OutputStream();
			toplevel.print(stream);

			return stream.toString();
		},

		/**
		 * Zepto version number
		 * 
		 * @type {String}
		 */
		zeptoVersion: null,
		
		/**
		 * Main init method that kickstarts everything
		 * 
		 * @return {[type]} [description]
		 */
		init: function () {
			this.builder = new DownloadBuilder(CONFIG);
			this.showVersion();
			this.modules.init();
			this.modal.init();

			// Keyboard shortcuts
			key('⌘+a, ctrl+a', this.modules.toggleAll);
			key('⌘+shift+a, ctrl+shift+a', this.modules.toggleAll);
			key('esc', this.modal.hide);

			return this;
		},

		/**
		 * Fetches the current Zepto version, either from GitHub or from sessionStorage,
		 * and updates the corresponding DOM element
		 */
		showVersion: function () {
			var cacheKey = 'zb-zepto-version';

			if ( this.cache.get(cacheKey) ) {
				this.zeptoVersion = this.cache.get(cacheKey);
				return $('#v').text(this.zeptoVersion);
			}

			this.builder.JSONP(API_URL + REPO_PATH + '/package.json' + AUTH_QRYSTR, function (data) {
				ZB.zeptoVersion = JSON.parse(ZB.builder._parseGithubResponse({'data': data})).version;

				ZB.cache.set(cacheKey, ZB.zeptoVersion);

				$('#v').text(ZB.zeptoVersion);
			});
		},

		/**
		 * Small wrapper around sessionStorage caching
		 *
		 * @type {Object}
		 */
		cache: {

			/**
			 * Write to cache (and format objects if necessary)
			 * 
			 * @param {String}        key
			 * @param {String|Object} value
			 */
			set: function (key, value) {
				if ( sessionStorage ) {
					if ( $.isPlainObject(value) ) {
						value = JSON.stringify(value);
					}
					sessionStorage.setItem(key, value);
				}
			},

			/**
			 * Fetch items from cache
			 * 
			 * @param  {String} key
			 * @return {String}
			 */
			get: function (key) {
				return sessionStorage && sessionStorage.getItem(key);
			}

		},

		/**
		 * Simple tooltip functionality that shows the module description
		 * when hovering the table rows
		 * 
		 * @type {Object}
		 */
		tooltip: {

			/**
			 * Tooltip DOM element
			 * 
			 * @type {Object}
			 */
			$el: $('.tooltip'),

			/**
			 * Simple helper to show the actual tooltip
			 */
			show: function (e) {
				ZB.tooltip.$el.html($(this).find('.hide').text()).removeClass('hide');
				ZB.tooltip.move(e);
			},

			/**
			 * Makes sure that the tooltip is positioned based on mouse movement
			 */
			move: function (e) {
				ZB.tooltip.$el.css({
					'top': (e.pageY - 50 - (ZB.tooltip.$el.height()/2) ) + 'px',
					'left': (e.pageX + 10) + 'px'
				});
			},

			/**
			 * Simple helper to, guess what, hide the actual tooltip!
			 */
			hide: function () {
				ZB.tooltip.$el.addClass('hide');
			}

		},

		/**
		 * Modal dialog with the generated output
		 * 
		 * @type {Object}
		 */
		modal: {

			/**
			 * Set the corresponding copy keyboard reference
			 */
			init: function () {
				$('#copy-sign').html((navigator.platform.indexOf('Mac') !== -1 ? '⌘' : 'Ctrl'));
			},

			/**
			 * Show modal dialog
			 */
			show: function () {
				$body.addClass('move-from-top');
			},

			/**
			 * Hide modal dialog
			 */
			hide: function () {
				$body.removeClass('move-from-top');
			}
			
		},

		/**
		 * All module related functionality
		 * @type {Object}
		 */
		modules: {

			/**
			 * Keeps track of the selected modules
			 * 
			 * @type {Array}
			 */
			selection: ['zepto', 'event', 'ajax', 'form', 'ie'],

			/**
			 * Used to map module descriptions
			 * 
			 * @type {Object}
			 */
			metaData: {},

			/**
			 * Initializes module overview
			 */
			init: function () {
				this.load();
				this.loadMetaData();
				this.observe();
			},

			/**
			 * All necessary event listeners
			 */
			observe: function () {
				$(document)
					.on('click', '.overlay', ZB.modal.hide)
					.on('submit', '#builder', this.generate)
					.on('click', '.topcoat-list__item:not(.disabled)', this.select)
					.on('mouseenter', '.topcoat-list__item', ZB.tooltip.show)
					.on('mousemove', '.topcoat-list__item', ZB.tooltip.move)
					.on('mouseleave', '.topcoat-list__item', ZB.tooltip.hide);
			},

			/**
			 * Simply fetches the corresponding module metadata, stored in a static JSON file.
			 * Perhaps this should change in the future
			 */
			loadMetaData: function () {
				var cacheKey = 'zb-modules-metadata';

				if ( ZB.cache.get(cacheKey) ) {
					ZB.metaData = JSON.parse(ZB.cache.get(cacheKey));
					return;
				}

				$.get(MODULE_METADATA_PATH, function (response) {
					ZB.modules.length = Object.keys(response).length;
					ZB.cache.set(cacheKey, response);
					ZB.metaData = response;
				});
			},

			/**
			 * Generates the actual Zepto build and shows the 
			 * 
			 * @param  {Object} e event object
			 */
			generate: function (e) {
				var checkboxes = $('.checkbox:checked:not([disabled])').get();

				e.preventDefault();

				if ( !checkboxes.length ) {
					return;
				}

				checkboxes.unshift($('.checkbox[disabled]')[0]);

				$generateBtn.attr('disabled', 'disabled');
				spinner.spin($('#spin')[0]);

				ZB.builder.buildURL(
					$(checkboxes),
					FILE_NAME,
					'javascript',
					function (data) {
						var comment = TOP_COMMENT.replace('%i', ZB.zeptoVersion).replace('%s', ZB.modules.selection.join(' ')),
							output = comment + data.content,
							minified = comment;

						if ( $('#uglify')[0].checked ) {
							minified += ZB._minify(data.content);
							
							$('#saved').text('You saved: ' + ((1 - minified.length / output.length) * 100).toFixed(2) + '%');

							if ( ZB.builder.supportsFilesystem ) {
								ZB.builder.createURL({
									data: minified,
									lang: 'javascript',
									fileName: MIN_FILE_NAME,
									callback: function (url) {
										ZB.modules.handleOutput(MIN_FILE_NAME, url, minified);
									}
								});
							} else {
								ZB.modules.handleOutput(null, null, minified);
							}

							return;
						}

						ZB.modules.handleOutput(FILE_NAME, data.url, output);

						data = null;
						output = null;
					});
			},

			/**
			 * Handles the last step in the generate process
			 * 
			 * @param  {String} fileName
			 * @param  {String} url
			 * @param  {String} output
			 */
			handleOutput: function (fileName, url, output) {
				if ( ZB.builder.supportsFilesystem ) {
					$saveBtn
						.attr({
							'download': fileName,
							'href': url
						})
						.css('display', 'inline-block');
				}

				ZB.modal.show();
				spinner.stop();

				$generateBtn.removeAttr('disabled');
				$source.val(output).trigger('focus');
				$source[0].select();

				output = null;
			},

			/**
			 * Fetches the module contents, either from GitHub or from cache and injects it into the DOM
			 */
			load: function() {
				var cacheKey = 'zb-modules';

				if ( ZB.cache.get(cacheKey) ) {
					return $modules.html( ZB.cache.get(cacheKey) );
				}

				ZB.builder.JSONP(API_URL + REPO_PATH + SRC_PATH + AUTH_QRYSTR, function (response) {
					var tpl = $('#module-tpl').html(),
						modules = '';

					for (var m in response.data) {
						if ( ZB.metaData.hasOwnProperty(response.data[m].name) ) {
							response.data[m].description = ZB.metaData[response.data[m].name].description;
							response.data[m].checked = (ZB.metaData[response.data[m].name].default ? 'checked' : false);
							response.data[m].selected = (ZB.metaData[response.data[m].name].default ? 'selected' : false);
							response.data[m].disabled = (response.data[m].name === 'zepto.js' ? 'disabled' : false);

							ZB.metaData[response.data[m].name].size = response.data[m].size;
						}
						response.data[m].size = _bytesToSize(response.data[m].size);
						modules += ZB.modules.parse(tpl, response.data[m]);
					}

					$modules.html(modules);

					ZB.cache.set(cacheKey, modules);
				});
			},

			/**
			 * Small template 'engine' function
			 * http://mir.aculo.us/2011/03/09/little-helpers-a-tweet-sized-javascript-templating-engine/
			 *
			 * @author Thomas Fuchs
			 * @param {string} s
			 * @param {object} d
			 * @return {string} compiled template
			 */
			parse: function (s, d) {
				for (var p in d) {
					s = s.replace(new RegExp('{{' + p + '}}', 'g'), d[p]);
				}
				return s;
			},

			/**
			 * Selects the clicked row and corresponding checkbox
			 * Also, disables the generate button when no modules are selected
			 * 
			 * @param  {Object} e event object
			 */
			select: function (e) {
				var $row = $(e.target).parents('tr'),
					$checkbox = $row.find('.checkbox'),
					mod = $checkbox[0].value.replace(/src\/(.+).js/, '$1');

				$row.toggleClass('selected');

				if ( e.target.nodeName === 'INPUT' ) {
					return;
				}

				if ( $checkbox[0].checked && $.inArray(mod, ZB.modules.selection) > -1 ) {
					ZB.modules.selection.splice($.inArray(mod, ZB.modules.selection), 1);
				} else if ( !$checkbox[0].checked ) {
					ZB.modules.selection.push(mod);
				}

				$checkbox.prop('checked', !$checkbox[0].checked);
			},

			/**
			 * Toggles all checkboxes at once
			 */
			toggleAll: function (e) {
				var rows = 'tr:not(.selected)';

				if ( $modules.find('.checkbox:checked').length === ZB.modules.length ) {
					rows = 'tr';
				}

				$modules.find(rows).each(function () {
					$(this).find('.checkbox').trigger('click');
				});

				e.preventDefault();
			}
		}
	};

	return ZB.init();
});