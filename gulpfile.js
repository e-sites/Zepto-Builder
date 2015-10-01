var gulp = require('gulp');
var minifyCss = require('gulp-minify-css');
var htmlmin = require('gulp-html-minifier');
var filter = require('gulp-filter');
var uglify = require('gulp-uglify');
var rev = require('gulp-rev');
var revReplace = require('gulp-rev-replace');
var useref = require('gulp-useref');
var del = require('del');
var runSequence = require('run-sequence');
var dest = './dist';

gulp.task('clean', function () {
	return del([dest]);
});

gulp.task('copy', function () {
	return gulp.src([
			'assets/img/**/*',
			'assets/js/uglify.min.js',
			'assets/js/worker.js',
			'assets/json/modules.json'
		], {base: '.'})
		.pipe(gulp.dest(dest));
});

gulp.task('build', function () {
	var jsFilter = filter('**/*.js');
	var cssFilter = filter('**/*.css');
	var assets = useref.assets();

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

gulp.task('default', ['clean'], function () {
	runSequence('copy', 'build', 'htmlmin');
});