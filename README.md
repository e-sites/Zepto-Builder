Zepto Builder
====
<blockquote>
	<p>Zepto Builder will let you generate a custom version of Zepto that just includes the modules you need.</p>
</blockquote>

The tool itself is located @ http://github.e-sites.nl/zeptobuilder/

##Getting started
After cloning (or downloading) the repo you must run <code>npm install</code> to fetch all dependencies, when this is done all Bower packages will automatically be downloaded and a browser build of Uglify will be created.

##Grunt
Grunt is used to created a distribution build. By running the default Grunt task it will optimize all resources and store them in the dist folder.

##Under the hood
So, how does this tool actually work? Well, altough Zepto offers a CLI-based build tool I have decided to make it client-side only, based on <a href="https://github.com/gfranko/DownloadBuilder.js">DownloadBuilder</a>. The process from selecting the modules to actually generating the build (and minify it) is:
<ul>
	<li>all available Zepto module metadata (i.e. name, size and URL) is dynamically fetched from GitHub and cached (for now this is session based);</li>
	<li>the module descriptions are mapped via a static JSON file (assets/json/modules.json) and are shown when hovering the table rows;</li>
	<li>based on ones selection the modules will be fetched from GitHub and concatenated by DownloadBuilder</li>
	<li>the minification process is handled by a browser build of Uglify</li>
</ul>

##Credits
First and foremost, of course, Thomas Fuchs of Zepto fame (and all it's contributors). Also, Mihai Bazon, the creator of Uglify, and Greg Franko the author of DownloadBuilder.

##Browser support
Tested in the latest (stable) version of Google Chrome, Mozilla Firefox, Opera and Safari. As for Internet Explorer; I haven't been able to test properly...but I am guessing IE>9.

##Road map
<ul>
	<li>Improve browser support</li>
	<li>Offer 'save to disk' option for minified builds as well</li>
	<li>File size totals when selecting modules</li>
	<li>Complement docs and inline comments</li>
	<li>Unit testing</li>
	<li><em>...any other suggestions are welcome!</em></li>
</ul>

##License
Copyright (C) 2013 e-sites, <a href="http://www.e-sites.nl/">http://e-sites.nl/</a> Licensed under the MIT license.
