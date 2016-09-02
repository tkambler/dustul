#!/usr/bin/env node
'use strict';

const program = require('commander');

program
    .version('0.0.3')
    .command('render', 'Render configured templates')
    .parse(process.argv);
