'use strict';

module.exports = {
    'json': (value) => {
        try {
            return JSON.parse(value);
        } catch(err) {
            console.log(err);
            return undefined;
        }
    }
};
