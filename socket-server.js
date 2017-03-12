'use strict';

const socket_io = require('socket.io')();

socket_io.on('connection', (socket) => {
    console.log('new client connected');

    socket.on('code-change', (event) => {
        // Broadcast this event
        socket.broadcast.emit('other-user-change-code', event);
    });
});

module.exports = socket_io;