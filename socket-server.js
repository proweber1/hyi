'use strict';

const config = require('./config/application');
const io = require('socket.io')({
    origins: config.socketSecurityOrigins
});

const ShareCode = require('./services/ShareCode');
const redis = require('./connections/redis');
const CodeSync = require('./services/CodeSync')
    , codeSync = new CodeSync(redis);
const Settings = require('./services/Settings')
    , settings = new Settings(redis);
const logger = require('./logger');

const StreamingAlgorithm = require('./services/share_code_algorithms/Streaming');

const socketRooms = new Map();
const roomSettings = new Map();

/*
Это событие происходит когда новый клиент соединился с сервером

TODO: Подумать над тем, как можно сделать обработку похожих событий централизовано
TODO: Убрать дублирование получения комнаты сокета
TODO: Подумать как снизить нагрузку на хранилище при записи большого количества данных
 */
io.on('connection', (socket) => {

    logger.info('New client connected');

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

        settings.fetchSettings(roomId)
            .then(settings => {
                if (settings) {
                    logger.info(`Settings load successful for ${roomId} room`);
                    socket.emit('room-settings', settings);
                    roomSettings.set(roomId, settings);
                }

                return codeSync.fetchState(roomId);
            })
            .then(state => {
                logger.info(`Code sync for ${roomId} room, languages`, JSON.stringify(Object.keys(state)));
                socket.emit('code-sync', state)
            });
    });

    /*
    Это событие должен послать клиент, когда внутри окна редактора что-то
    изменилось, событие должно быть таким, чтобы сам клиент его потом мог
    разобрать и как-то обработать.
     */
    socket.on('code-change', (event) => {

        const socketRoom = socketRooms.get(socket);
        const settings = roomSettings.get(socketRoom);

        const lang = (settings && settings.languages) ? settings.languages : 'javascript';
        codeSync.saveCode(socketRoom, lang, event);

        logger.info(`Users write code in ${socketRoom} on ${lang} language`);

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
        const roomName = socketRooms.get(socket);

        io.sockets.to(roomName).emit('before-code-run');

        const share_code = new ShareCode(request, new StreamingAlgorithm());
        share_code.runCode();

        logger.info(`Code run in room: ${roomName}`, JSON.stringify(request));

        /*
         Все что нам валит докер мы отправляем на клиента, чтобы транслировать все
         это в консоль на клиентской части
         */
        share_code.on('docker-output', data => {
            io.sockets.to(roomName).emit('run-code-output', data);
        });
    });

    /*
    Это событие посылпается когда один из программистов изменил настройки редактора
    и эти настройки надо применить на остальных редакторах
     */
    socket.on('settings', (event) => {

        const socketRoom = socketRooms.get(socket);
        roomSettings.set(socketRoom, event);
        settings.pushSettings(socketRoom, event);

        logger.info(`Pushed new settings to ${socketRoom}`, JSON.stringify(event));

        /*
        Транслируем настройки всем пользователям которые с нами кодят
        одновременно
         */
        socket.broadcast
            .to(socketRoom)
            .emit('new-settings', event);
    });

    /*
    Когда пользователь отключается от сервера, нужно удалить его из списка комнат
    и почистить буфер кода если это был последний клиент, чтобы не допускать утечек
    памяти в системе.
     */
    socket.on('disconnect', () => {
        const roomName = socketRooms.get(socket);
        socketRooms.delete(socket);
        roomSettings.delete(roomName);

        logger.info(`Client disconnected, room_id: ${roomName}`);
    });
});

module.exports = io;