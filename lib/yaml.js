#!/usr/local/bin/node
'use strict';

var fs = require('fs');
var yaml = require('js-yaml');

var parse = function(data, front) {
	var output = null;
	var content = null;

	if(front) {
		var re = /^(-{3}(?:\n|\r)([\w\W]+?)(?:\n|\r)-{3})?([\w\W]*)*/;
		var results = re.exec(data);

		if(results && results[2]) {
			data = results[2];
			content = results[3];
		}
	}

	if(data) {
		if(data.charAt(0) === '{') {
			output = JSON.parse(data);
		}
		else {
			output = yaml.load(data);
		}
	}

	if(output != data) {
		if(front) {
			return {
				front: output,
				content: content ? content.trim() : null
			};
		}
		else {
			return output;
		}
	}
	else {
		return null;
	}
};

var dump = function(object) {
	return yaml.dump(object);
};

var load = function(path, front, callback) {
	fs.exists(path, function(exists) {
		if(exists) {
			fs.readFile(path, function(err, data) {
				if(err) {
					throw err;
				}
				else if(data) {
					data = parse(data.toString());

					if(front && data) {
						callback(data.front, data.content);
					}
					else {
						callback(data);
					}
				}
				else {
					callback(null, null);
				}
			});
		}
		else {
			callback(null, null);
		}
	});
};

module.exports = {
	parse: parse,
	dump: dump,
	load: load
};
