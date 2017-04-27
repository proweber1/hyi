'use strict';

const Promise = require('bluebird');

/**
 * Данный класс работает с состояниями дельт которые присылает клиент, мы
 * их храним в редисе
 */
class CodeSync {

    /**
     * @param redis
     */
    constructor(redis) {
        this.redis = redis;
    }

    /**
     * Сохраняет написанный пользователем код в редис
     *
     * @param socketRoom Комната в которой кодят
     * @param lang Язык программирования
     * @param delta Дельта редактора
     * @returns {*} промис
     */
    saveCode(socketRoom, lang, delta) {
        return this.redis.rpushAsync(`${socketRoom}:langs:${lang}`, JSON.stringify(delta));
    }

    /**
     * Возвращает дельты для разных языков определенной комнаты.
     *
     * @param socketRoom
     * @returns {string|Socket}
     */
    fetchState(socketRoom) {
        let keysPromise = this._getKeysBySocketRoom(socketRoom);
        let deltasPromise = this._getDeltasByKeys(keysPromise);

        return Promise.join(keysPromise, deltasPromise, this._computeState);
    }

    /**
     * Загружает ключи доступные для текущей комнаты
     *
     * @param socketRoom
     * @returns {*}
     * @private
     */
    _getKeysBySocketRoom(socketRoom) {
        return this.redis.keysAsync(`${socketRoom}:langs:*`);
    }

    /**
     * Загружает дельты по доступным ключам
     *
     * @param keysPromise
     * @returns {Promise}
     * @private
     */
    _getDeltasByKeys(keysPromise) {
        return keysPromise
            .then(keys => {
                let promises = keys.map(key => this.redis.lrangeAsync(key, 0, -1));

                return Promise.all(promises);
            });
    }

    /**
     * Создает единую структуру данных с из дельт и языков программирования для
     * которых у нас дельты были сохранены
     *
     * @param langs
     * @param deltas
     * @returns {{}}
     * @private
     */
    _computeState(langs, deltas) {
        let result = {};

        langs.forEach((v, k) => {
            result[v.split(':').pop()] = deltas[k].map(JSON.parse);
        });

        return result;
    }
}

module.exports = CodeSync;