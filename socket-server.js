'use strict';

const socket_io = require('socket.io')();

socket_io.on('connection', (socket) => {
    console.log('new client connected');
});

module.exports = socket_io;