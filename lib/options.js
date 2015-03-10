#!/usr/local/bin/node
'use strict';

var _ = require('underscore');
var async = require('async');
var yaml = require('./yaml');
var extendify = require('./extendify-custom');
var pandoc = require('./pandoc-utils');
var fs = require('fs');

_.merge = extendify({
	inPlace: true,
	arrays : 'concat'
});

var cleanOptions = function(options) {
	var cleanFilters = function(filters) {
		return _.map(filters, function(item) {
			var name, options;

			if(typeof item === 'string') {
				name = item;
				options = null;
			}
			else if(Object.keys(item).length === 1) {
				name = Object.keys(item)[0];
				options = item[name];
			}
			else {
				var error = new Error('Unexpected item in array. Did you forget to indent a filter block?');
			}

			var parts = name.match(/^(.+?)(:(.+))?$/);

			var info = {
				module: parts[1]
			};

			if(parts[3]) {
				info.action = parts[3];
			}

			if(options) {
				info.options = options;
			}

			return info;
		});
	};

	var cleanModules = function(collection, array) {
		var values = {};

		_.each(collection, function(item) {
			if(typeof item === 'string') {
				values[item] = values[item] || null;
			}
			else if(Object.keys(item).length === 1) {
				var name = Object.keys(item)[0];
				var options = item[name];

				if(values[name]) {
					values[name] = _.merge(values[name], options || {});
				}
				else {
					values[name] = options;
				}
			}
		});

		return values;
	};

	if(!options) {
		return null;
	}

	options.config = options.config || {};
	options.config.filters = cleanFilters(options.config.filters || []);
	options.config.modules = cleanModules(options.config.modules || []);

	return options;
};

var mergeOptions = function(options) {
	var _core = {};
	var _config = {};
	var _modules = {};
	var _filters = [];
	var _search = [];

	_.each(options, function(core) {
		if(!core) return;

		// save values
		var config = core.config || {};
		var modules = config.modules || {};
		var filters = config.filters || [];
		var search = config.search || [];

		delete core.config;
		delete config.modules;
		delete config.filters;
		delete config.search;

		// merge settings
		_core = _.merge(_core, core);
		_config = _.merge(_config, config);
		_modules = _.merge(_modules, modules);
		_filters = _filters.concat(filters);
		_search = _search.concat(search);
	});

	_.each(_filters, function(filter) {
		if(_modules[filter.module] === undefined) {
			_modules[filter.module] = null;
		}
	});

	_core.merged = true;
	_core.config = _config;
	_config.filters = _filters;
	_config.modules = _modules;
	_config.search = _search.reverse();

	return _core;
};

var loadOptions = function(merge, callback) {
	var options = [];
	var content;

	var generateLoader = function(path, position) {
		return function(callback) {
			yaml.load(path, false, function(data) {
				if((data = cleanOptions(data))) {
					options[position] = data;
				}

				callback();
			});
		};
	};

	var parseInput = function(input) {
		var output = null;
		content = input;

		try {
			output = JSON.parse(input);
			content = output;

			output = pandoc.parseAST(output[0]);
		}
		catch (e) {
			var temp = yaml.parse(input, true);

			if(temp) {
				output = temp.front;
				content = temp.content;
			}
		}

		if(output && output._merged) {
			output = cleanOptions(output);
		}

		return output;
	};

	if(merge) {
		var path = require('path');
		var dir = process.cwd();

		var paths = [], p;

		do {
			p = path.join(dir, '.pandoc.yml');

			if(fs.existsSync(p)) {
				paths.push(p);
			}

			dir = path.dirname(dir);
		}
		while(dir !== process.env.HOME && dir.indexOf(process.env.HOME) === 0);

		p = path.join(process.env.HOME, '.pandoc/default.yml');

		if(fs.existsSync(p)) {
			paths.push(p);
		}

		var tasks = _.map(paths, generateLoader).concat(function(callback) {
			require('get-stdin')(function(data) {
				if((data = parseInput(data))) {
					options[paths.length] = data;
				}

				callback();
			});
		});

		async.parallel(tasks, function() {
			options = mergeOptions(options);
			callback(options, content);
		});
	}
	else {
		require('get-stdin')(function(data) {
			// TODO: remove merge after AST is properly parsed
			options = parseInput(data);
			callback(options, content);
		});
	}
};

var dumpOptions = function(options, content) {
	if(typeof content === 'object') {
		console.error(content);

		content[0] = pandoc.writeAST(options);
		return JSON.stringify(content);
	}
	else {
		return '---\n' + yaml.dump(options) + '---\n' + content;
	}
};

module.exports = {
	clean: cleanOptions,
	merge: mergeOptions,
	load: loadOptions,
	dump: dumpOptions
};
