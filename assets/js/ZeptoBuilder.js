define([
	'zepto',
	'DownloadBuilder',
	'uglify'
], function($, DownloadBuilder, UglifyJS) {

	'use strict';

	var $body = $('body'),
		$source = $('#source'),
		$modules = $('#modules'),
		$generateBtn = $('#btn-generate'),

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

		CONFIG = {
			'location': 'github',
			'author': 'madrobby',
			'repo': 'zepto',
			'branch': 'master',
			'client_id': '44ea087258fd57a58a53',
			'client_secret': '08e6bdee04caf16e0f4e6f9b4508adc43ac8a7cd'
		},
		//DEFAULT_MODULES = ['zepto', 'event', 'ajax', 'form', 'ie'],
		API_URL = 'https://api.github.com',
		REPO_PATH = '/repos/madrobby/zepto/contents',
		SRC_PATH = '/src';

	var ZeptoBuilder = {

		/**
		 * Minify wrapper that leverages Uglify2
		 * Based on https://gist.github.com/jpillora/5652641
		 * 
		 * @param  {String} codes
		 * @param  {Object} options
		 * @return {String} minified output
		 * @private
		 * 
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
		 * Init method that kickstarts everything
		 * 
		 * @return {[type]} [description]
		 */
		init: function () {
			this.builder = new DownloadBuilder(CONFIG);
			this.getVersion();
			this.modules.init();
			this.modal.init();

			return this;
		},

		getVersion: function () {
			var version;

			if ( sessionStorage && sessionStorage.getItem('zepto-version') ) {
				return $('#v').text(sessionStorage.getItem('zepto-version'));
			}

			this.builder.JSONP(API_URL + REPO_PATH + '/package.json', function (data) {
				version = JSON.parse(ZeptoBuilder.builder._parseGithubResponse({'data': data})).version;

				if ( sessionStorage ) {
					sessionStorage.setItem('zepto-version', version);
				}

				$('#v').text(version);
			});
		},

		tooltip: {
			$el: $('.tooltip'),
			show: function (e) {
				ZeptoBuilder.tooltip.$el.html($(this).find('.hide').text()).removeClass('hide');
				ZeptoBuilder.tooltip.move(e);
			},
			move: function (e) {
				ZeptoBuilder.tooltip.$el.css({
					'top': (e.pageY - 50 - (ZeptoBuilder.tooltip.$el.height()/2) ) + 'px',
					'left': (e.pageX + 10) + 'px'
				});
			},
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
			init: function () {
				$('#copy-sign').html((navigator.platform.indexOf('Mac') !== -1 ? '⌘' : 'Ctrl'));
			},

			show: function () {
				$body.addClass('move-from-top');
			},

			hide: function () {
				$body.removeClass('move-from-top');
			}
		},

		/**
		 * All module related functionality
		 * @type {Object}
		 */
		modules: {

			metaData: {},

			init: function() {
				this.load();
				this.loadMetaData();
				this.observe();
			},

			observe: function () {
				$(document)
					.on('keyup', function (e) {
						if ( e.keyCode === 27 ) {
							ZeptoBuilder.modal.hide();
						}
					})
					.on('click', '.overlay', ZeptoBuilder.modal.hide)
					.on('submit', 'form', this.generate)
					.on('click', '#select-button', this.selectSource)
					.on('click', '.topcoat-list__item', this.select)
					.on('mouseenter', '.topcoat-list__item', ZeptoBuilder.tooltip.show)
					.on('mousemove', '.topcoat-list__item', ZeptoBuilder.tooltip.move)
					.on('mouseleave', '.topcoat-list__item', ZeptoBuilder.tooltip.hide);
			},

			loadMetaData: function () {
				var self = this;
				$.get('assets/json/modules.json', function (response) {
					self.metaData = response;
				});
			},

			generate: function (e) {
				var $checkboxes = $('.checkbox:checked');

				e.preventDefault();

				if ( !$checkboxes.length ) {
					return;
				}

				ZeptoBuilder.builder.buildURL(
					$checkboxes,
					'zepto.js',
					'javascript',
					function (data) {
						var input = data.content,
							minified;

						if ( $('#uglify')[0].checked ) {
							minified = ZeptoBuilder._minify(data.content);
							$('#file').hide();
							$('#saved').text('You saved: ' + ((1 - minified.length / input.length) * 100).toFixed(2) + '%');
						} else {
							$('#file').show();
						}

						$('#file').attr('href', data.url);
						$source.val(minified || input);

						ZeptoBuilder.modal.show();

						$source.focus();
						$source[0].select();
					});
			},

			cache: function (input) {
				if ( sessionStorage ) {
					sessionStorage.setItem('zepto-modules', input);
				}
			},

			load: function() {
				var self = this;

				if ( sessionStorage && sessionStorage.getItem('zepto-modules') ) {
					return $modules.html(sessionStorage.getItem('zepto-modules'));
				}

				ZeptoBuilder.builder.JSONP(API_URL + REPO_PATH + SRC_PATH, function (response) {
					var tpl = $('#module-tpl').html(),
						modules = '';

					for (var m in response.data) {
						if ( self.metaData.hasOwnProperty(response.data[m].name) ) {
							response.data[m].description = self.metaData[response.data[m].name].description;
							response.data[m].checked = (self.metaData[response.data[m].name].default ? 'checked' : false);
						}
						modules += ZeptoBuilder.modules.parse(tpl, response.data[m]);
					}

					ZeptoBuilder.modules.cache(modules);

					$modules.html(modules);
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
			 * 
			 * @param  {Object} e event object
			 */
			select: function (e) {
				var $row = $(e.target).parents('tr'),
					$checkbox = $row.find('.checkbox');

				if ( e.target.nodeName === 'INPUT' ) {
					return;
				}

				$row.toggleClass('selected');
				$checkbox.prop('checked', !$checkbox[0].checked);

				if ( !$('.checkbox:checked').length ) {
					$generateBtn.attr('disabled', 'disabled');
				} else {
					$generateBtn.removeAttr('disabled');
				}
			}
		}
	};

	return ZeptoBuilder.init();
});