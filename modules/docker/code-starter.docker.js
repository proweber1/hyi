'use strict';

const config = require('../../config/application');
const uuid = require('uuid/v4');
const process = require('child_process');
const EventEmitter = require('events');

/**
 * Этот класс запускает контейнер на исполнение кода
 * который прислал клиент
 */
class ShareCode extends EventEmitter {

    /**
     * @param config Конфигурация которую прислал клиент
     * @param codeSaver
     * @param algorithm
     */
    constructor(config, codeSaver, algorithm) {
        super();

        this.setAlgorithm(algorithm);
        this.code_saver = codeSaver;
        this.lang = config.programmingLanguage;
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
     * @returns {*}
     */
    getRunnerName() {
        return this.lang + '.sh';
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
                    config.modules.docker.imageName,
                    this.downDockerContainerAndRemoveCode.bind(this)
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
     */
    downDockerContainerAndRemoveCode(codeDirectory) {
        process.exec(`rm -r ${codeDirectory}`);

        this.emit('docker-finish');
    }
}

module.exports = ShareCode;