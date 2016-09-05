#!/usr/bin/env node
'use strict';

const program = require('commander');

program
    .version('0.0.6')
    .command('subscribe', 'Subscribe to Consul changes and render configured templates')
    .parse(process.argv);
