(function (window) {

	'use strict';

	// Some minor config details
	require.config({
		paths: {
			'uglify2': 'uglify2/lib/',
			'base64': '../bower/base64/base64',
			'uglify': 'uglify.min',
			'almond': '../bower/almond/almond',
			'keymaster': '../bower/keymaster/keymaster',
			'spin': '../bower/spin.js/spin'
		},
		shim: {
			'zepto': {
				exports: 'Zepto'
			},
			'DownloadBuilder': {
				exports: 'DownloadBuilder'
			},
			'uglify': {
				exports: 'UglifyJS'
			},
			'keymaster': {
				exports: 'key'
			}
		}
	});

	// Polyfill for browsers which don't provide `window.btoa`
	if ( !window.btoa && !window.atob ) {
		require(['base64']);
	}

	// Kickstart the app
	require(['ZeptoBuilder']);

}(window));