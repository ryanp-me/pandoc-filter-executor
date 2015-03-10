#!/usr/local/bin/node
'use strict';

var _ = require('underscore');
var pandoc = require('pandoc-filter');

var parseAST = function(input) {
	if(input.t === 'MetaMap') {
		return _.object(_.map(input.c, function(val, key) {
			return [key, parseAST(val)];
		}));
	}
	else if(input.t === 'MetaList') {
		return _.map(input.c, parseAST);
	}
	else if(input.t === 'MetaBool') {
		return input.c;
	}
	else if(input.t === 'MetaInlines' || input.t === 'MetaString') {
		return pandoc.stringify(input);
	}
	else {
		return input;
	}
};

var writeAST = function(options) {
	return options;
};

module.exports = {
	parseAST: function(input) {
		var output = {};

		_.each(input.unMeta, function(value, key) {
			output[key] = parseAST(value);
		});

		return output;
	},
	writeAST: writeAST
};
