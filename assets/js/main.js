(function (window) {

	'use strict';

	// Some minor config details
	require.config({
		paths: {
			'uglify2': 'uglify2/lib/',
			'base64': '../bower/base64/base64',
			'uglify': 'uglify.min',
			'almond': '../bower/almond/almond',
		},
		shim: {
			'zepto': {
				exports: '$'
			},
			'DownloadBuilder': {
				exports: 'DownloadBuilder'
			},
			'uglify': {
				exports: 'UglifyJS'
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