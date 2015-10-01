importScripts('uglify.min.js');

self.addEventListener('message', function (e) {
	var codes = minify(e.data.code);
	self.postMessage({code: codes, output: e.data.output});
}, false);

/**
 * Minify wrapper that leverages Uglify
 * Based on https://gist.github.com/jpillora/5652641
 *
 * @param  {String} codes
 * @param  {Object} options
 * @return {String} minified output
 */
function minify(codes, options) {
	/*jshint camelcase:false */

	var toplevel = null,
		forEach = function (list, callback) {
			Array.prototype.forEach.call(list, callback);
		},
		compress, sq, stream;

	options = UglifyJS.defaults(options || {}, {
		warnings: false,
		mangle: {},
		compress: {}
	});

	if ( typeof codes === 'string' ) {
		codes = [codes];
	}

	Array.prototype.forEach.call(codes, function (code, index) {
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
}