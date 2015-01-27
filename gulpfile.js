var gulp = require('gulp');
var minifyCss = require('gulp-minify-css');
var htmlmin = require('gulp-html-minifier');
var filter = require('gulp-filter');
var uglify = require('gulp-uglify');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var uncss = require('gulp-uncss');
var useref = require('gulp-useref');
var del = require('del');
var runSequence = require('run-sequence');

gulp.task('build', function() {
	var jsFilter = filter("**/*.js");
	var cssFilter = filter("**/*.css");
	var assets = useref.assets();
	var dest = 'dist/';

	// Do some housekeeping first
	del([
		dest + '/*'
	]);

	// Copy json file with meta data
	gulp
		.src('./assets/json/modules.json')
		.pipe(gulp.dest('./dist/assets/json/'));

	return gulp.src('./index.html')
		.pipe(assets)
		.pipe(jsFilter)
		.pipe(uglify({
			output: {
				beautify: false
			},
			compress: {
				sequences: false
			},
			mangle: false
		}))
		.pipe(jsFilter.restore())
		.pipe(cssFilter)
		.pipe(uncss({
			html: ['./index.html'],
			ignore: [
				'.text-hide',
				'.gh',
				'.saved',
				'.topcoat-list__item.selected td',
				'.move-from-top .modal.active',
				'.move-from-top .overlay',
				'.move-from-top .saved',
				'input[type="checkbox"]:disabled + .topcoat-checkbox__checkmark'
			]
		}))
		.pipe(minifyCss({
			keepSpecialComments: 0
		}))
		.pipe(cssFilter.restore())
		.pipe(rev())
		.pipe(assets.restore())
		.pipe(useref())
		.pipe(revReplace())
		.pipe(gulp.dest(dest));
});

gulp.task('htmlmin', function() {
	return gulp.src('./dist/index.html')
		.pipe(htmlmin({
			collapseBooleanAttributes: true,
			collapseWhitespace: true,
			removeAttributeQuotes: true,
			removeComments: true,
			removeEmptyAttributes: true,
			removeRedundantAttributes: true,
			removeScriptTypeAttributes: true,
			removeStyleLinkTypeAttributes: true
		}))
		.pipe(gulp.dest('dist'));
});

gulp.task('uncss', function() {
	return gulp.src('./dist/**/*.css');
});

gulp.task('default', ['build'], function() {
	runSequence('htmlmin', 'uncss');
});