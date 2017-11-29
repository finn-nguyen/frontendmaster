#!/usr/bin/env node
'use strict';

var commander 	= require('commander');
var download 	= require('./download');

commander
  .command('dl <url>')
  .description('Download Videos Of Particular Course')
  .action(function(url) {
    download.boot(url);
});

commander.parse(process.argv);