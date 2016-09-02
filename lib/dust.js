'use strict';

const Promise = require('bluebird');
const dust = require('dustjs-linkedin');
require('dustjs-helpers');
dust.config.whitespace = true;

dust.helpers.iter = function(chunk, context, bodies, params) {

    var obj = dust.helpers.tap(params.obj, chunk, context);
    var destVar = dust.helpers.tap(params.dest, chunk, context) || '$value';
    var destKey = dust.helpers.tap(params.destKey, chunk, context) || '$key';

    var iterable = [];

    for ( var key in obj ) {
        if ( obj.hasOwnProperty(key) ) {
            var value = obj[key];
            var row = {
                '$type': typeof value
            };
            row[destKey] = key;
            row[destVar] = value;
            iterable.push(row);
        }
    }

  return chunk.section(iterable, context, bodies);

};

module.exports = Promise.promisifyAll(dust);
