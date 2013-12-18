module.exports = function(grunt) {
	'use strict';

	grunt.option('BUILD_DIR', 'dist');

	// load all grunt tasks
	require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	grunt.initConfig({

		// Package reference
		pkg: grunt.file.readJSON('package.json'),

		// 
		meta: {
			banner:
				'/*!\n' +
				' * Zepto Builder <%= pkg.version %> (<%= grunt.template.today("yyyy-mm-dd, HH:MM") %>)\n' +
				' * https://github.com/e-sites/Zepto-Builder\n' +
				' * MIT licensed\n' +
				' *\n' +
				' * Copyright (C) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>, <%= pkg.author.web %>\n' +
				' */'
		},

		// Wipe out previous builds and test reporting.
		clean: ['<%= grunt.option("BUILD_DIR") %>'],

		// Run your source code through JSHint's defaults.
		jshint: {
			options: {
				jshintrc: '.jshintrc',
				"force": false
			},
			all: ['assets/js/ZeptoBuilder.js', 'assets/js/main.js']
		},

		// This task uses James Burke's excellent r.js AMD builder to take all
		// modules and concatenate them into a single file.
		requirejs: {
			release: {
				options: {
					mainConfigFile: 'assets/js/main.js',
					removeCombined: false,
					skipDirOptimize: false,
					generateSourceMaps: false,
					include: ['main'],
					insertRequire: ['main'],
					out: '<%= grunt.option("BUILD_DIR") %>/assets/js/build.min.js',
					optimize: 'uglify',
					optimizeCss: false,

					// Since we bootstrap with nested `require` calls this option allows
					// R.js to find them.
					findNestedDependencies: true,

					// Include a minimal AMD implementation shim.
					name: 'almond',

					// Wrap everything in an IIFE.
					wrap: true,

					// Do not preserve any license comments when working with source
					// maps.  These options are incompatible.
					preserveLicenseComments: false,

					uglify: {
						output: {
							beautify: false
						},
						compress: {
							sequences: false
						},
						mangle: false
					}
				}
			}
		},

		// Minfiy the distribution CSS.
		cssmin: {
			release: {
				files: {
					'<%= grunt.option("BUILD_DIR") %>/assets/css/styles.min.css': ['assets/css/styles.css']
				}
			}
		},

		processhtml: {
			release: {
				files: {
					'<%= grunt.option("BUILD_DIR") %>/index.html': ['index.html']
				}
			}
		},

		htmlmin: {
			release: {
				options: {
					collapseBooleanAttributes: true,
					collapseWhitespace: true,
					removeAttributeQuotes: true,
					removeComments: true, // Only if you don't use comment directives!
					removeEmptyAttributes: true,
					removeRedundantAttributes: true,
					removeScriptTypeAttributes: false,
					removeStyleLinkTypeAttributes: true
				},
				files: {
					'<%= grunt.option("BUILD_DIR") %>/index.html': '<%= grunt.option("BUILD_DIR") %>/index.html'
				}
			}
		},

		// Move vendor and app logic during a build.
		copy: {
			release: {
				files: [
					{src: 'assets/json/modules.json', dest: '<%= grunt.option("BUILD_DIR") %>/assets/json/modules.json'}
				]
			}
		},

		usebanner: {
			release: {
				options: {
					position: 'top',
					banner: '<%= meta.banner %>',
					linebreak: true
				},
				files: {
					src: ['<%= grunt.option("BUILD_DIR") %>/assets/js/build.min.js']
				}
			}
		}
	});

	// When running the default Grunt command, just lint the code.
	grunt.registerTask('default', [
		'clean',
		'jshint',
		'processhtml',
		'copy',
		'htmlmin',
		'requirejs',
		'cssmin',
		'usebanner'
	]);
};
