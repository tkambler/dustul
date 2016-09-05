'use strict';

const program = require('commander');
const Promise = require('bluebird');
const assert = require('assert');
const consul = require('consul');
const path = require('path');
const _ = require('lodash');
const exec = require('./exec');
const fs = require('./fs');
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

        let consulConfig = _.cloneDeep(_.get(config, 'config.consul', {}));
        consulConfig.promisify = true;

        config.client = consul(consulConfig);

        _.defaults(config, {
            'watch': {},
            'context': {},
            'commands': []
        });

        config.watch = _.map(config.watch, (v, k) => {
            return {
                'property': k,
                'watchSettings': v
            };
        });

        if (config.command) {
            config.commands = [
                {
                    'command': config.command,
                    'args': config.args || []
                }
            ];
        }

        if (config.commands.length) {
            config.runCommands = () => {
                return Promise.resolve(config.commands)
                    .mapSeries((cmd) => {
                        debug('Executing command', cmd);
                        return exec(cmd.command, cmd.args, cmd.options)
                            .then((res) => {
                                debug('Execution result', res);
                                return res;
                            });
                    });
            };
        } else {
            config.runCommands = Promise.resolve([]);
        }

        config.render = _.debounce(() => {
            return Promise.resolve()
                .then(() => {
                    return _.isFunction(config.beforeRender) ? config.beforeRender(config.client, config.context) : undefined;
                })
                .then(() => {
                    return dust.renderSourceAsync(config.template, config.context);
                })
                .then((rendered) => {
                    rendered = config.trim ? rendered.trim() : rendered;
                    debug('rendered', rendered);
                    return fs.writeFileAsync(config.destination, rendered)
                        .then(() => {
                            if (_.isFunction(config.afterRender)) {
                                config.afterRender(config.context, rendered);
                            }
                        });
                })
                .then(() => {
                    return config.runCommands();
                })
                .then((res) => {
                    debug('Executed', typeof res, res);
                });
        }, 1000);

        return Promise.resolve(config.watch)
            .map((watchEntry, watchIndex) => {

                debug('Creating new watcher', {
                    'method': watchEntry.watchSettings.method
                });

                watchEntry.watcher = config.client.watch({
                    'method': _.get(config.client, watchEntry.watchSettings.method),
                    'options': watchEntry.watchSettings.options
                });

                watchEntry.watcher.on('change', (data, res) => {
                    let value;
                    if (_.isFunction(watchEntry.watchSettings.cb)) {
                        value = watchEntry.watchSettings.cb(data);
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
