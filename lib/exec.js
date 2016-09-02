'use strict';

let Promise = require('bluebird');
let spawn = require('child_process').spawn;
let _ = require('lodash');

module.exports = (cmd, args, options, onOut, onErr) => {

    return new Promise((resolve, reject) => {

        let stdOut = '';
        let stdErr = '';

        let spawned = spawn(cmd, args || [], options || {});

        spawned.stdout.on('data', (data) => {
            stdOut += data.toString('utf8');
            if (_.isFunction(onOut)) {
                onOut(data);
            }
        });

        spawned.stderr.on('data', (data) => {
            stdErr += data.toString('utf8');
            if (_.isFunction(onErr)) {
                onErr(data);
            }
        });

        spawned.on('close', (code) => {
            if (code === 0) {
                return resolve({
                    'code': code,
                    'stdout': stdOut,
                    'stderr': stdErr
                });
            } else {
                let err = new Error(stdErr);
                return reject(err);
            }
        });

    });

};
