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
	var ZeptoBuilder = {

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
			var version;

			if ( sessionStorage && sessionStorage.getItem('zepto-version') ) {
				return $('#v').text(sessionStorage.getItem('zepto-version'));
			}

			this.builder.JSONP(API_URL + REPO_PATH + '/package.json' + AUTH_QRYSTR, function (data) {
				version = JSON.parse(ZeptoBuilder.builder._parseGithubResponse({'data': data})).version;

				if ( sessionStorage ) {
					sessionStorage.setItem('zepto-version', version);
				}

				$('#v').text(version);
			});
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
				ZeptoBuilder.tooltip.$el.html($(this).find('.hide').text()).removeClass('hide');
				ZeptoBuilder.tooltip.move(e);
			},

			/**
			 * Makes sure that the tooltip is positioned based on mouse movement
			 */
			move: function (e) {
				ZeptoBuilder.tooltip.$el.css({
					'top': (e.pageY - 50 - (ZeptoBuilder.tooltip.$el.height()/2) ) + 'px',
					'left': (e.pageX + 10) + 'px'
				});
			},

			/**
			 * Simple helper to, guess what, hide the actual tooltip!
			 */
			hide: function () {
				ZeptoBuilder.tooltip.$el.addClass('hide');
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
			 * Used to map module descriptions
			 * 
			 * @type {Object}
			 */
			metaData: {},

			/**
			 * Initializes module overview
			 */
			init: function() {
				this.load();
				this.loadMetaData();
				this.observe();
			},

			/**
			 * All necessary event listeners
			 */
			observe: function () {
				$(document)
					.on('click', '.overlay', ZeptoBuilder.modal.hide)
					.on('submit', '#builder', this.generate)
					.on('click', '.topcoat-list__item', this.select)
					.on('mouseenter', '.topcoat-list__item', ZeptoBuilder.tooltip.show)
					.on('mousemove', '.topcoat-list__item', ZeptoBuilder.tooltip.move)
					.on('mouseleave', '.topcoat-list__item', ZeptoBuilder.tooltip.hide);
			},

			/**
			 * Simply fetches the corresponding module metadata, stored in a static JSON file.
			 * Perhaps this should change in the future
			 */
			loadMetaData: function () {
				var self = this;
				$.get(MODULE_METADATA_PATH, function (response) {
					ZeptoBuilder.modules.length = Object.keys(response).length;
					self.metaData = response;
				});
			},

			/**
			 * Generates the actual Zepto build and shows the 
			 * 
			 * @param  {Object} e event object
			 */
			generate: function (e) {
				var $checkboxes = $('.checkbox:checked');

				e.preventDefault();

				if ( !$checkboxes.length ) {
					return;
				}

				$generateBtn.attr('disabled', 'disabled');
				spinner.spin($('#spin')[0]);

				ZeptoBuilder.builder.buildURL(
					$checkboxes,
					FILE_NAME,
					'javascript',
					function (data) {
						var output = data.content,
							minified;

						if ( $('#uglify')[0].checked ) {
							minified = ZeptoBuilder._minify(data.content);
							
							$('#saved').text('You saved: ' + ((1 - minified.length / output.length) * 100).toFixed(2) + '%');

							if ( ZeptoBuilder.builder.supportsFilesystem ) {
								ZeptoBuilder.builder.createURL({
									data: minified,
									lang: 'javascript',
									fileName: MIN_FILE_NAME,
									callback: function (url) {
										ZeptoBuilder.modules.handleOutput(MIN_FILE_NAME, url, minified);
									}
								});
							} else {
								ZeptoBuilder.modules.handleOutput(null, null, minified);
							}

							return;
						}

						ZeptoBuilder.modules.handleOutput(FILE_NAME, data.url, output);

						data = null;
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
				if ( ZeptoBuilder.builder.supportsFilesystem ) {
					$saveBtn
						.attr({
							'download': fileName,
							'href': url
						})
						.css('display', 'inline-block');
				}

				ZeptoBuilder.modal.show();
				spinner.stop();

				$generateBtn.removeAttr('disabled');
				$source.val(output).trigger('focus');
				$source[0].select();

				output = null;
			},

			/**
			 * Cache the generated module HTML fragments
			 */
			cache: function (input) {
				if ( sessionStorage ) {
					sessionStorage.setItem('zepto-modules', input);
				}
			},

			/**
			 * Fetches the module contents, either from GitHub or from cache and injects it into the DOM
			 */
			load: function() {
				var self = this;

				if ( sessionStorage && sessionStorage.getItem('zepto-modules') ) {
					return $modules.html(sessionStorage.getItem('zepto-modules'));
				}

				ZeptoBuilder.builder.JSONP(API_URL + REPO_PATH + SRC_PATH + AUTH_QRYSTR, function (response) {
					var tpl = $('#module-tpl').html(),
						modules = '';

					for (var m in response.data) {
						if ( self.metaData.hasOwnProperty(response.data[m].name) ) {
							response.data[m].description = self.metaData[response.data[m].name].description;
							response.data[m].checked = (self.metaData[response.data[m].name].default ? 'checked' : false);
							response.data[m].selected = (self.metaData[response.data[m].name].default ? 'selected' : false);
						}
						response.data[m].size = _bytesToSize(response.data[m].size);
						modules += ZeptoBuilder.modules.parse(tpl, response.data[m]);
					}

					$modules.html(modules);
					ZeptoBuilder.modules.cache(modules);
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
					$checkbox = $row.find('.checkbox');

				$row.toggleClass('selected');

				if ( e.target.nodeName === 'INPUT' ) {
					return;
				}

				$checkbox.prop('checked', !$checkbox[0].checked);

				if ( !$('.checkbox:checked').length ) {
					$generateBtn.attr('disabled', 'disabled');
				} else {
					$generateBtn.removeAttr('disabled');
				}
			},

			/**
			 * Toggles all checkboxes at once
			 */
			toggleAll: function (e) {
				var rows = 'tr:not(.selected)';

				if ( $modules.find('.checkbox:checked').length === ZeptoBuilder.modules.length ) {
					rows = 'tr';
				}

				$modules.find(rows).each(function () {
					$(this).find('.checkbox').trigger('click');
				});

				e.preventDefault();
			}
		}
	};

	return ZeptoBuilder.init();
});