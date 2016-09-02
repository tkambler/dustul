'use strict';

const program = require('commander');
const Promise = require('bluebird');
const assert = require('assert');
const consul = require('consul');
const path = require('path');
const _ = require('lodash');
const exec = require('./exec');
const fs = require('./fs');
const filters = require('./filters');
const dust = require('./dust');
const debug = require('debug')('dustul');

program
    .option('-c, --config <string>', 'Path to a config file')
    .parse(process.argv);

const configPath = path.resolve(program.config);

let configEntries = require(configPath);

configEntries = _.isArray(configEntries) ? configEntries : [configEntries];

Promise.resolve(configEntries)
    .each((config) => {

        assert(config.destination, `destination is required`);
        config.destination = path.resolve(config.destination);

        config.client = consul({
            'promisify': true,
            'host': _.get(config, 'config.consul.host'),
            'port': _.get(config, 'config.consul.port', 8500)
        });

        _.defaults(config, {
            'watch': {},
            'context': {}
        });

        config.watch = _.map(config.watch, (v, k) => {
            return {
                'property': k,
                'watchSettings': v
            };
        });

        config.render = _.debounce(() => {
            if (_.isFunction(config.beforeRender)) {
                config.beforeRender(config.context);
            }
            return dust.renderSourceAsync(config.template, config.context)
                .then((rendered) => {
                    debug('rendered', rendered);
                    return fs.writeFileAsync(config.destination, rendered);
                })
                .then(() => {
                    return exec(config.command, config.args);
                })
                .then((res) => {
                    debug('Executed', res);
                });
        }, 1000);

        return Promise.resolve(config.watch)
            .map((watchEntry, watchIndex) => {

                watchEntry.watcher = config.client.watch({
                    'method': _.get(config.client, watchEntry.watchSettings.method),
                    'options': watchEntry.watchSettings.options
                });

                watchEntry.watcher.on('change', (data, res) => {
                    let value;
                    if (watchEntry.watchSettings.filter) {
                        value = filters[watchEntry.watchSettings.filter](data.Value);
                    } else {
                        value = data.Value;
                    }
                    debug('change', {
                        'property': watchEntry.property,
                        'data': data,
                        'value': value
                    });
                    _.set(config.context, watchEntry.property, value);
                    config.render();
                });

                watchEntry.watcher.on('error', (err) => {
                    console.log(err);
                });

                return watchEntry;

            });

    });
