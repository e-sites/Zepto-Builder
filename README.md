Zepto Builder
====
<blockquote>
	<p>Zepto Builder is the web based equivalent of the regular Zepto build process and will let you generate a custom version that just includes the modules you need.</p>
</blockquote>

The service itself is located @ http://github.e-sites.nl/zeptobuilder/

##Why this tool?
By default, Zepto provides a build tool, based on Node.js and Coffeescript. So, why this tool? Well, for starters because there are some folk that are simply not comfortable with a CLI :).

##Getting started
After cloning (or downloading) the repo you must run <code>npm install</code> to fetch all dependencies, when this is done all Bower packages will automatically be downloaded and a browser build of Uglify will be created. Needless to say, for this to work you will need to have Node.js and Bower installed on your machine.

##Grunt task
Grunt is used to create a distribution build. By running the default Grunt task it will optimize all resources and store them in the <code>dist</code> folder.
The files located in this folder are prepared to be uploaded / deployed as is.

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
Tested in the latest (stable) versions of Google Chrome, Mozilla Firefox, Opera and Safari. As for Internet Explorer; I have tested it in IE9 and up (since 0.4.0).

##Road map
<ul>
	<li><del>Improve browser support</del> <ins>As from 0.4.0, IE9 is supported as well</li>
	<li><del>Offer 'save to disk' option for minified builds as well</del> <ins>This feature landed in 0.4.0</ins></li>
	<li>File size totals when selecting modules</li>
	<li>Complement docs and inline comments</li>
	<li>Unit testing</li>
	<li><em>...any other suggestions are welcome!</em></li>
</ul>

##License
Copyright (C) 2013 e-sites, <a href="http://www.e-sites.nl/">http://e-sites.nl/</a> Licensed under the MIT license.
