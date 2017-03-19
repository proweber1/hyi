'use strict';

const winston = require('winston');

winston.configure({
    transports: [
        new (winston.transports.File)({
            name: 'errors',
            filename: 'error-log.log',
            level: 'error',
            json: true
        }),
        new (winston.transports.Console)({
            colorize: true,
        })
    ]
});

module.exports = winston;