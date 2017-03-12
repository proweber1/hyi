'use strict';

const socket_io = require('socket.io')();

/*
Это событие происходит когда новый клиент соединился с сервером
 */
socket_io.on('connection', (socket) => {
    console.log('new client connected');

    /*
    Это событие должен послать клиент, когда внутри окна редактора что-то
    изменилось, событие должно быть таким, чтобы сам клиент его потом мог
    разобрать и как-то обработать.
     */
    socket.on('code-change', (event) => {

        /*
        На это событие бекенд просто рассылает этот эвент с клиентам остальным
        клиентам доступным сейчас, чтобы обновить у них окно редактора
         */
        socket.broadcast.emit('other-user-change-code', event);
    });
});

module.exports = socket_io;