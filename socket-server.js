'use strict';

const io = require('socket.io')();
const ShareCode = require('./services/ShareCode');

/*
Это событие происходит когда новый клиент соединился с сервером

TODO: Подумать над тем, как можно сделать обработку похожих событий централизовано
 */
io.on('connection', (socket) => {
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

    /*
    Данный метод запускает код на исполнение в докер контейнере и стримит потом ответ
    для клиента
     */
    socket.on('run-code', (request) => {
        io.sockets.emit('before-code-run');

        const share_code = new ShareCode(request);
        share_code.runCode();

        /*
         Все что нам валит докер мы отправляем на клиента, чтобы транслировать все
         это в консоль на клиентской части
         */
        share_code.on('docker-output', data => io.sockets.emit('run-code-output', data));
    });

    /*
    Это событие посылпается когда один из программистов изменил настройки редактора
    и эти настройки надо применить на остальных редакторах
     */
    socket.on('settings', (event) => {
        console.log(event);

        /*
        Транслируем настройки всем пользователям которые с нами кодят
        одновременно
         */
        socket.broadcast.emit('new-settings', event);
    })
});

module.exports = io;