#!/usr/local/bin/node
'use strict';

var child_process = require('child_process');
var options = require('./lib/options');
var PANDOC_BIN = '/usr/local/bin/pandoc';

var main = function() {
	options.load(true, function(core, input) {
		var args = ['-F', process.argv[1] + '-executor'];

		if(core.config.arguments) {
			args = args.concat(core.config.arguments || []);
		}

		if(core.config.template) {
			args = args.concat(['--template', core.config.template]);
		}

		args = args.concat(process.argv.slice(2));

		var output = options.dump(core, input);

		var child = child_process.spawn(PANDOC_BIN, args, {
			stdio: ['pipe', process.stdout, process.stderr]
		});

		child.stdin.write(output);
		child.stdin.end();

		child.on('close', function(code) {
			process.exit(code);
		});
	});
};

process.on('uncaughtException', function(e) {
	console.error(e.stack);
	process.stderr.write('\n');
	process.exit(-1);
});

main();
