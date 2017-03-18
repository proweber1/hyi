'use strict';

const io = require('socket.io')();
const ShareCode = require('./services/ShareCode');
const redis = require('./connections/redis');
const CodeSync = require('./services/CodeSync')
    , codeSync = new CodeSync(redis);

const StreamingAlgorithm = require('./services/share_code_algorithms/Streaming');

const socketRooms = new Map();
const roomsProgrammingLang = new Map();

/*
Это событие происходит когда новый клиент соединился с сервером

TODO: Подумать над тем, как можно сделать обработку похожих событий централизовано
TODO: Убрать дублирование получения комнаты сокета
TODO: Подумать как снизить нагрузку на хранилище при записи большого количества данных
 */
io.on('connection', (socket) => {

    /*
    Когда сокет коннектиться к нам, то мы должны его записать в группу, если
    группа уже есть, то отсылаем ему код для синхронизации
     */
    socket.on('join-to-room', (roomId) => {
        if (Object.keys(socket.rooms).length >= 2) {
            return ;
        }

        socket.join(roomId);
        socketRooms.set(socket, roomId);

        codeSync.fetchState(roomId)
            .then(state => socket.emit('code-sync', state));
    });

    /*
    Это событие должен послать клиент, когда внутри окна редактора что-то
    изменилось, событие должно быть таким, чтобы сам клиент его потом мог
    разобрать и как-то обработать.
     */
    socket.on('code-change', (event) => {

        const socketRoom = socketRooms.get(socket);
        const lang = roomsProgrammingLang.get(socketRoom) || 'javascript';

        codeSync.saveCode(socketRoom, lang, event);

        /*
        На это событие бекенд просто рассылает этот эвент с клиентам остальным
        клиентам доступным сейчас, чтобы обновить у них окно редактора
         */
        socket.broadcast
            .to(socketRoom)
            .emit('other-user-change-code', event);
    });

    /*
    Данный метод запускает код на исполнение в докер контейнере и стримит потом ответ
    для клиента
     */
    socket.on('run-code', (request) => {
        io.sockets
            .to(socketRooms.get(socket))
            .emit('before-code-run');

        const share_code = new ShareCode(request, new StreamingAlgorithm());
        share_code.runCode();

        /*
         Все что нам валит докер мы отправляем на клиента, чтобы транслировать все
         это в консоль на клиентской части
         */
        share_code.on('docker-output', data => {
            io.sockets
                .to(socketRooms.get(socket))
                .emit('run-code-output', data);
        });
    });

    /*
    Это событие посылпается когда один из программистов изменил настройки редактора
    и эти настройки надо применить на остальных редакторах
     */
    socket.on('settings', (event) => {

        roomsProgrammingLang.set(socketRooms.get(socket), event.languages);

        /*
        Транслируем настройки всем пользователям которые с нами кодят
        одновременно
         */
        socket.broadcast
            .to(socketRooms.get(socket))
            .emit('new-settings', event);
    });

    /*
    Когда пользователь отключается от сервера, нужно удалить его из списка комнат
    и почистить буфер кода если это был последний клиент, чтобы не допускать утечек
    памяти в системе.
     */
    socket.on('disconnect', () => {
        socketRooms.delete(socket);
    });
});

module.exports = io;