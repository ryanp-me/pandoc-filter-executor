#!/usr/local/bin/node
'use strict';

var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var pandoc = require('pandoc-filter');

var options = require('./lib/options');

var main = function() {
	options.load(false, function(options, input) {
		var format = (process.argv.length > 2 ? process.argv[2]: '');

		var modules = {};
		var search = options.config.search;
		var filters = options.config.filters;

		_.each(options.config.modules, function(info, name) {
			var modulePath = info && info.path;

			if(!modulePath) {
				for(var i = 0; i < search.length; i++) {
					var attempt = path.join(search[i], name + '.js');

					if(attempt.substr(0, 1) === '~') {
						attempt = process.env.HOME + attempt.substr(1);
					}

					if(fs.existsSync(attempt)) {
						modulePath = attempt;
						break;
					}
				}
			}

			if(!modulePath) {
				var error = new Error('Could not find filter module in search path: ' + name);
				throw error;
			}
			else {
				var config = modules[name];
				modules[name] = require(path.relative(__dirname, modulePath))(config);
			}
		});

		var output = input;

		_.each(filters, function(filter) {
			var handler = modules[filter.module](filter.action, options);

			if(handler) {
				output = pandoc.walk(output, handler, format, options);
			}
		});

		process.stdout.write(JSON.stringify(output));
	});
};

process.on('uncaughtException', function(e) {
	console.error(e.stack);
	process.stderr.write('\n');
	process.exit(-1);
});

main();
