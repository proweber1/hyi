'use strict';

class Settings {
    constructor(redis) {
        this.redis = redis;
    }

    /**
     * Устанавливает настройки для определенной комнаты
     *
     * @param room
     * @param settings
     * @returns {*}
     */
    pushSettings(room, settings) {
        return this.redis.setAsync(`${room}:settings`, JSON.stringify(settings));
    }

    /**
     * Возвращает настройки для определенной комнаты
     *
     * @param room
     * @returns {*}
     */
    fetchSettings(room) {
        return this.redis.getAsync(`${room}:settings`)
            .then(settings => settings ? JSON.parse(settings) : {});
    }
}

module.exports = Settings;