(function (window) {

	'use strict';

	require.config({
		paths: {
			'uglify2': 'uglify2/lib/',
			'base64': '../bower/base64/base64',
			'zepto': '../bower/zepto/zepto',
			'uglify': 'uglify.min',
			'zeroclipboard': '../bower/zeroclipboard/zeroclipboard',
			'almond': '../bower/almond/almond',
		},
		shim: {
			'zepto': {
				exports: '$'
			},
			'DownloadBuilder': {
				exports: 'DownloadBuilder'
			},
			'zeroclipboard': {
				exports: 'ZeroClipboard'
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

	require(['ZeptoBuilder']);

}(window));