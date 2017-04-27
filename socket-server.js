'use strict';

const config = require('./config/application');

const io = require('socket.io')({
    origins: config.modules.socket.socketSecurityOrigins
});

const ShareCode = require('./modules/sharing/code-saver.sharing')
    , redis = require('./connections/redis')
    , CodeSync = require('./modules/sync/code-sync.sync')
    , codeSync = new CodeSync(redis)
    , Settings = require('./modules/settings/settings-provider.settings')
    , settings = new Settings(redis)
    , logger = require('./logger')
    , StreamingAlgorithm = require('./modules/docker/run-algorithms/streaming.docker')
    , socketRooms = new Map()
    , roomSettings = new Map();

io.on('connection', (socket) => {

    logger.info('New client connected');

    /*
     When a socket connects to us, then we need to write it to a group, if the group
     already exists, then we send it the code for synchronization
     */
    socket.on('join-to-room', (roomId) => {
        if (Object.keys(socket.rooms).length >= 2) {
            return ;
        }

        socket.join(roomId);
        socketRooms.set(socket, roomId);

        socket.broadcast.to(roomId).emit('new-client-connected');

        settings.fetchSettings(roomId)
            .then(settings => {
                const finalSettings = settings || config.client.defaultSettings;

                logger.info(`Settings load successful for ${roomId} room`, JSON.stringify(finalSettings));
                socket.emit('room-settings', finalSettings);
                roomSettings.set(roomId, finalSettings);

                return codeSync.fetchState(roomId);
            })
            .then(state => {
                logger.info(`Code sync for ${roomId} room, languages`, JSON.stringify(Object.keys(state)));
                socket.emit('code-sync', state)
            });
    });

    /*
     This event should be sent by the client, when something has changed
     inside the editor window, the event should be such that the client
     can then parse it and somehow process it.
     */
    socket.on('code-change', (event) => {

        const socketRoom = socketRooms.get(socket);
        const settings = roomSettings.get(socketRoom);

        const lang = (settings && settings.languages) ? settings.languages : 'javascript';
        codeSync.saveCode(socketRoom, lang, event);

        logger.info(`Users write code in ${socketRoom} on ${lang} language`);

        /*
         At this event, the backend simply sends this event with clients to
         other clients available now to update their editor window
         */
        socket.broadcast
            .to(socketRoom)
            .emit('other-user-change-code', event);
    });

    /*
     This method starts the code for execution in the docker
     container and then feeds the response for the client
     */
    socket.on('run-code', (request) => {
        const roomName = socketRooms.get(socket);

        io.sockets.to(roomName).emit('before-code-run');

        const share_code = new ShareCode(request, new StreamingAlgorithm());
        share_code.runCode();

        logger.info(`Code run in room: ${roomName}`, JSON.stringify(request));

        /*
         Everything that the docker brings down to us is sent to the
         client to broadcast it all to the console on the client side
         */
        share_code.on('docker-output', data => {
            io.sockets.to(roomName).emit('run-code-output', data);
        });

        share_code.on('docker-finish', () =>
            io.sockets.to(roomName).emit('run-code-finish'));
    });

    /*
     This event is served when one of the programmers has changed the editor's
     settings and these settings should be applied to the rest of the editors
     */
    socket.on('settings', (event) => {

        const socketRoom = socketRooms.get(socket);
        roomSettings.set(socketRoom, event);
        settings.pushSettings(socketRoom, event);

        logger.info(`Pushed new settings to ${socketRoom}`, JSON.stringify(event));

        /*
         We broadcast the settings to all users who code with us at the same time
         */
        socket.broadcast
            .to(socketRoom)
            .emit('new-settings', event);
    });

    /*
     Chat events

     The user sent a message, we sent it to all the sockets in
     the room in which the user is located
     */
    socket.on('send-message', (event) => {
        const roomId = socketRooms.get(socket);

        logger.info(`New message in room: ${roomId}, message event: `, JSON.stringify(event));
        io.sockets.to(roomId).emit('new-message', event);
    });

    /*
     When the user disconnects from the server, you need to remove it from
     the list of rooms and clean the code buffer if it was the last client
     to prevent memory leaks in the system.
     */
    socket.on('disconnect', () => {
        const roomName = socketRooms.get(socket);

        socket.broadcast.to(roomName).emit('client-disconnected');

        socketRooms.delete(socket);
        roomSettings.delete(roomName);

        logger.info(`Client disconnected, room_id: ${roomName}`);
    });
});

module.exports = io;