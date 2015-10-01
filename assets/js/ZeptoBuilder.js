/**
 *  Zepto Builder
 *  Zepto Builder will let you generate a custom version of Zepto that just includes the modules you need
 *
 *  @author  : Boye Oomens <github@e-sites.nl>
 *  @version : 1.0.0-beta
 *  @license : MIT
 *  @see     : http://github.e-sites.nl/zeptobuilder/
 */

(function ($) {
	/*global Zepto, DownloadBuilder, key */

	'use strict';

	// Cached DOM elements
	var $body = $('body'),
		$source = $('#source'),
		$modules = $('#modules'),
		$comment = $('#comment'),
		$modals = $('.zb-modal'),
		$saved = $('#saved'),
		$generateBtn = $('#btn-generate'),
		$saveBtn = $('#btn-save'),
		$uglify = $('#uglify'),
		$spinner = $('#spinner'),

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

		topComment = '/*! Zepto %i (generated with Zepto Builder) - %s - zeptojs.com/license */\n',

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
	 *
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
	 * Small template 'engine' function
	 * http://mir.aculo.us/2011/03/09/little-helpers-a-tweet-sized-javascript-templating-engine/
	 *
	 * @author Thomas Fuchs
	 * @param {string} s
	 * @param {object} d
	 * @return {string} compiled template
	 * @private
	 */
	function _template(s, d) {
		for (var p in d) {
			s = s.replace(new RegExp('{{' + p + '}}', 'g'), d[p]);
		}
		return s;
	}

	/**
	 * Injects FB' JavaScript SDK
	 *
	 * @param  {Object} d
	 * @param  {String} s
	 * @param  {String} id
	 * @private
	 */
	function _loadFBSdk(d,s,id) {
		var js,
			fjs = d.getElementsByTagName(s)[0];

		if ( d.getElementById(id) ) {
			return;
		}

		js = d.createElement(s);
		js.id = id;
		js.src = '//connect.facebook.net/en_US/sdk.js#xfbml=1&version=v2.4&appId=225350897592962';
		fjs.parentNode.insertBefore(js, fjs);
	}

	/**
	 * Namespace that encapsulates all ZB related logic
	 *
	 * @type {Object}
	 */
	var ZB = {

		/**
		 * Newest Zepto version number
		 *
		 * @type {String}
		 */
		currentVersion: null,

		/**
		 * Total file size of the custom build
		 *
		 * @type {Number}
		 */
		totalFileSize: 0,

		/**
		 * Main init method that kickstarts everything
		 *
		 * @return {Object} [description]
		 */
		init: function () {
			this.builder = new DownloadBuilder(CONFIG);
			this.getVersion();
			this.modules.init();
			this.modal.init();

			// Keyboard shortcuts
			key('⌘+a, ctrl+a', this.modules.toggleAll);
			key('⌘+shift+a, ctrl+shift+a', this.modules.toggleAll);
			key('esc', this.modal.hide);
			key('p', this.showPresetModal);

			return this;
		},

		/**
		 * Fetches the current Zepto version, either from GitHub or from sessionStorage
		 */
		getVersion: function () {
			var versionKey = ZB.cache.keys.version;

			if ( this.cache.get(versionKey) ) {
				this.currentVersion = this.cache.get(versionKey);
				return this.displayVersion();
			}

			this.builder.JSONP(API_URL + REPO_PATH + '/package.json' + AUTH_QRYSTR, function (data) {
				ZB.currentVersion = JSON.parse(ZB.builder._parseGithubResponse({'data': data})).version;
				ZB.cache.set(versionKey, ZB.currentVersion);
				ZB.displayVersion();
			});
		},

		/**
		 * Displays the current Zepto version
		 */
		displayVersion: function () {
			$('#v').text(ZB.currentVersion);
		},

		/**
		 * Shows modal where one can paste zepto.js header comment to load a module preset
		 *
		 * @param {Object} event object
		 */
		showPresetModal: function (e) {
			ZB.modal.show('#preset');
			$comment.focus();
			e.preventDefault();
		},

		/**
		 * Keeps track of the total file size
		 * Both as private member as wel as in session storage
		 *
		 * @param  {Number} fs file size
		 */
		updateFileSize: function (fs) {
			if ( !fs ) {
				fs = 0;
				$modules.find('.is-selected').find('.size').each(function () {
					fs += $(this).data('bytes');
				});
			}

			ZB.totalFileSize = Number(fs);

			$('#total-size').html( '(' + _bytesToSize(ZB.totalFileSize) + ')' );
		},

		/**
		 * GA tracking logic
		 *
		 * @param {String} category
		 * @param {String} action
		 * @param {String} label
		 * @see https://developers.google.com/analytics/devguides/collection/gajs/eventTrackerGuide
		 */
		trackEvent: function (category, action, label, value) {
			/* global ga */

			if ( typeof ga !== 'function' ) {
				return;
			}

			ga('send', 'event', category, action, label, value);
		},

		/**
		 * Returns top comment including version and selected modules
		 *
		 * @return {String}
		 */
		getTopComment: function () {
			return topComment.replace('%i', ZB.currentVersion).replace('%s', ZB.modules.selection.join(' '));
		},

		/**
		 * Small wrapper around sessionStorage caching
		 *
		 * @type {Object}
		 */
		cache: {

			/**
			 * Map with keys that are used as cache identifiers
			 *
			 * @type {Object}
			 */
			keys: {
				version: 'zb-current-version',
				metadata: 'zb-modules-metadata',
				modules: 'zb-modules',
				selection: 'zb-selection'
			},

			/**
			 * Write to cache (and format objects if necessary)
			 *
			 * @param {String}        key
			 * @param {String|Object} value
			 */
			set: function (key, value) {
				if ( sessionStorage ) {
					if ( $.isPlainObject(value) || $.isArray(value) ) {
						value = JSON.stringify(value);
					}
					sessionStorage.setItem(key, value);
				}
			},

			/**
			 * Removes an item from the cache
			 *
			 * @param {String} key
			 */
			remove: function (key) {
				if ( sessionStorage && key ) {
					sessionStorage.removeItem(key);
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
			show: function (selector) {
				$modals
					.removeClass('active')
					.filter(selector)
					.addClass('active');

				$body.addClass('move-from-bottom');

				if ( selector.indexOf('about') > -1 && !window.FB ) {
					_loadFBSdk(document, 'script', 'facebook-jssdk');
				}
			},

			/**
			 * Hide modal dialog
			 */
			hide: function (cb) {
				$body.removeClass('move-from-bottom');
				$modals.removeClass('active').off();

				if ( cb && $.isFunction(cb) ) {
					cb.apply(ZB, []);
				}
			},

			load: function () {
				ZB.modal.show('#' + $(this).data('modal'));
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
				this.loadMetaData();
				this.observe();
			},

			/**
			 * All necessary event listeners
			 */
			observe: function () {
				$(document)
					.on('click', '.zb-backdrop', ZB.modal.hide)
					.on('click', '[data-modal]', ZB.modal.load)
					.on('click', '[data-href]', function () {
						document.location.href = $(this).data('href');
					})
					.on('click', '#btn-generate', this.generate)
					.on('paste', '#comment', this.handlePreset)
					.on('click', '.zb-module-item:not(.disabled)', this.select);
			},

			/**
			 * Simply fetches the corresponding module metadata, stored in a static JSON file.
			 * Perhaps this should change in the future
			 */
			loadMetaData: function () {
				var cacheKey = 'zb-modules-metadata';

				if ( ZB.cache.get(cacheKey) ) {
					ZB.metaData = JSON.parse(ZB.cache.get(cacheKey));
					ZB.modules.load();
					return;
				}

				$.get(MODULE_METADATA_PATH, function (response) {
					ZB.modules.length = Object.keys(response).length;
					ZB.cache.set(cacheKey, response);
					ZB.metaData = response;
					ZB.modules.load();
				});
			},

			/**
			 * Fetches the module contents, either from GitHub or from cache and injects it into the DOM
			 */
			load: function () {
				var version = ZB.currentVersion,
					cacheKey = ZB.cache.keys.modules;

				$modules.html(_template($('#loading-tpl').html(), {v: version}));

				if ( ZB.cache.get(cacheKey) ) {
					return $modules.html( ZB.cache.get(cacheKey) ) && ZB.updateFileSize();
				}

				ZB.builder.JSONP(API_URL + REPO_PATH + SRC_PATH + AUTH_QRYSTR, function (response) {
					var tpl = $('#module-tpl').html(),
						fileSize = 0,
						modules = '';

					for (var m in response.data) {
						if ( ZB.metaData.hasOwnProperty(response.data[m].name) ) {
							response.data[m].description = ZB.metaData[response.data[m].name].description;
							response.data[m].checked = (ZB.metaData[response.data[m].name].default ? 'checked' : '');
							response.data[m].selected = (ZB.metaData[response.data[m].name].default ? 'is-selected' : '');
							response.data[m].disabled = (response.data[m].name === 'zepto.js' ? 'disabled' : '');

							ZB.metaData[response.data[m].name].size = response.data[m].size;
						}
						response.data[m].bytes = response.data[m].size;
						response.data[m].size = _bytesToSize(response.data[m].size);

						if ( response.data[m].selected ) {
							fileSize += response.data[m].bytes;
						}

						modules += _template(tpl, response.data[m]);
					}

					$modules.html(modules);

					ZB.updateFileSize(fileSize);
					ZB.cache.set(cacheKey, modules);
					ZB.cache.set(ZB.cache.keys.selection, ZB.modules.selection);
				});
			},

			/**
			 * Generates the actual Zepto build
			 *
			 * @param  {Object} e event object
			 */
			generate: function (e) {
				var checkboxes = $('.zb-checkbox:checked:not([disabled])').get();

				e.preventDefault();

				// The core Zepto.js module needs to be processed first
				checkboxes.unshift($('.zb-checkbox[disabled]')[0]);

				$spinner.addClass('is-active');
				$generateBtn.attr('disabled', 'disabled');

				ZB.builder.buildURL(
					$(checkboxes),
					FILE_NAME,
					'javascript',
					ZB.modules.processBuild
				);
			},

			/**
			 * Kickstarts build process
			 *
			 * @param  {Object} data
			 */
			processBuild: function (data) {
				var comment = ZB.getTopComment(),
					output = comment + data.content,
					worker;

				ZB.trackEvent(
					'Zepto ' + ZB.currentVersion + ($uglify[0].checked ? ' (minified)' : ''),
					'Generate',
					'Modules',
					ZB.modules.selection.join(', ')
				);

				$saved.empty();

				if ( $uglify[0].checked ) {
					worker = ZB.modules.createWorker({code: data.content, output: output.length});
					worker.addEventListener('message', ZB.modules.minify, false);
				} else {
					ZB.modules.handleOutput(FILE_NAME, data.url, output);
				}

				data = null;
				output = null;
			},

			/**
			 * Creates new Worker instance and delivers the code that needs to be minified
			 *
			 * @param  {String} codes
			 * @return {Worker}
			 */
			createWorker: function (codes) {
				var worker = new Worker('assets/js/worker.js');

				worker.postMessage(codes);

				return worker;
			},

			/**
			 * Processes the code that is minified by the Worker.
			 *
			 * @param {Object} e Worker event object
			 */
			minify: function (e) {
				var minified = ZB.getTopComment(),
					percentage;

				minified += e.data.code;
				percentage = ((1 - minified.length / e.data.output) * 100).toFixed(2);

				$saved.text( _bytesToSize(ZB.totalFileSize - ((percentage / 100) * ZB.totalFileSize)) + ' (you saved: ' + percentage + '%)');

				if ( ZB.builder.supportsFilesystem ) {
					ZB.builder.createURL({
						data: minified,
						lang: 'javascript',
						fileName: MIN_FILE_NAME,
						callback: function (url) {
							ZB.modules.handleOutput(MIN_FILE_NAME, url, minified);
							minified = null;
						}
					});
				} else {
					ZB.modules.handleOutput(null, null, minified);
					minified = null;
				}
			},

			/**
			 * Extracts modules based on the given header comment
			 */
			handlePreset: function () {
				setTimeout($.proxy(function () {
					if ( this.value && this.value.match(/zeptojs.com\/license/) ) {
						ZB.modules.resetSelection();

						$.each($.trim(this.value.split('-')[1]).split(' '), function () {
							$modules
								.find('input[value="src/' + this + '.js"]')
								.parents('.zb-module-item')
								.trigger('click');
						});

						ZB.trackEvent(
							'Zepto ' + ZB.currentVersion,
							'Preset',
							'Modules: ',
							'unknown'
						);

						ZB.modal.hide(function () {
							$comment.val('').blur();
						});
					}
				}, this), 250);
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
					$('#save-option').removeClass('hide');

					$saveBtn
						.attr({
							'download': fileName,
							'href': url
						})
						.on('click', ZB.modal.hide)
						.removeClass('hide');
				}

				ZB.modal.show('#output');
				$spinner.removeClass('is-active');

				$generateBtn.removeAttr('disabled');
				$source.val(output).trigger('focus');
				$source[0].select();

				output = null;
			},

			/**
			 * Selects the clicked row and corresponding checkbox
			 * Also, disables the generate button when no modules are selected
			 *
			 * @param  {Object} e event object
			 */
			select: function (e) {
				var $row = $(this),
					$label = $row.find('label'),
					$checkbox = $row.find('.zb-checkbox'),
					mod = $checkbox[0].value.replace(/src\/(.+).js/, '$1'),
					fileSize;

				if ( e.target.nodeName !== 'INPUT' ) {
					e.preventDefault();
					e.stopPropagation();
				}

				$checkbox.prop('checked', !$checkbox[0].checked);
				$row.toggleClass('is-selected');
				$label.toggleClass('is-checked', $checkbox[0].checked);

				if ( !$checkbox[0].checked && $.inArray(mod, ZB.modules.selection) > -1 ) {
					ZB.modules.selection.splice($.inArray(mod, ZB.modules.selection), 1);
					fileSize = ZB.totalFileSize - $row.find('.size').data('bytes');
				} else if ( $checkbox[0].checked ) {
					ZB.modules.selection.push(mod);
					fileSize = ZB.totalFileSize + $row.find('.size').data('bytes');
				}

				ZB.cache.set(ZB.cache.keys.selection, ZB.modules.selection);
				ZB.updateFileSize( fileSize );
			},

			/**
			 * Resets current selection, except for the core module
			 */
			resetSelection: function () {
				$modules.find('.zb-checkbox').filter(':checked').parents('tr').trigger('click');
			},

			/**
			 * Toggles all checkboxes at once
			 */
			toggleAll: function (e) {
				var rows = '.zb-module-item:not(.is-selected)';

				if ( $modules.find('.zb-checkbox').length === ZB.modules.selection.length ) {
					rows = '.zb-module-item';
				}

				$modules.find(rows).each(function () {
					$(this).trigger('click');
				});

				e.preventDefault();
			}
		}
	};

	/**
	 * Kickstart Zepto Builder
	 */
	ZB.init();

}(Zepto));