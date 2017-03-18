'use strict';

const uuid = require('uuid/v4');
const process = require('child_process');
const EventEmitter = require('events');
const CodeSaver = require('./CodeSaver');

/**
 * Этот класс запускает контейнер на исполнение кода
 * который прислал клиент
 */
class ShareCode extends EventEmitter {

    /**
     * @param config Конфигурация которую прислал клиент
     * @param algorithm
     */
    constructor(config, algorithm) {
        super();

        this.setAlgorithm(algorithm);
        this.lang = config.programmingLanguage;
        this.code_saver = new CodeSaver(config);
    }

    /**
     * @param algorithm Алгоритм запуска и работы докер контейнера
     */
    setAlgorithm(algorithm) {
        this.algorithm = algorithm;
    }

    /**
     * Возвращает имя запускатора исходя из языка программирования
     * который выбрал пользователь
     *
     * TODO: Рефакторить
     *
     * @returns {*}
     */
    getRunnerName() {
        if ('javascript' === this.lang) {
            return 'javascript.sh';
        } else if ('php' === this.lang) {
            return 'php.sh';
        } else if ('java' === this.lang) {
            return 'java.sh';
        } else {
            throw new Error('undefined language');
        }
    }

    /**
     * Запускает на выполнение код пользователя в докер контейнере
     */
    runCode() {
        this.code_saver.createFiles()
            .then(codeDirectory => {
                const containerName = uuid();
                this.algorithm.runDocker(
                    this,
                    codeDirectory,
                    this.getRunnerName(),
                    containerName,
                    ShareCode.downDockerContainerAndRemoveCode
                );
            });
    }

    /**
     * Вынес в отдельный метод чтобы не дублировать это внутри отлова событий
     *
     * @param data Данные из докера
     */
    emitOutput(data) {
        this.emit('docker-output', data.toString());
    }

    /**
     * Удаляем докер контейнер (чтобы не засирать память) и удаляем код с сервера
     * чтобы так же освободить ресурсы
     *
     * @param codeDirectory
     * @param containerName
     */
    static downDockerContainerAndRemoveCode(codeDirectory, containerName) {
        process.exec(`rm -r ${codeDirectory}`);
        process.exec(`docker rm ${containerName}`);
    }
}

module.exports = ShareCode;