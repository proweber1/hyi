'use strict';

const fsp = require('fs-promise');
const path = require('path');
const uuid = require('uuid/v4');
const process = require('child_process');
const EventEmitter = require('events');

/**
 * Класс который сохраняет код который прислал пользователь, чтобы
 * потом его прокинуть в докер контейнер
 */
class CodeSaver {

    /**
     * @param config Запрос который прислал клиент
     */
    constructor(config) {
        this.config = config;
    }

    /**
     * Собирает имя файла по языку программирования
     *
     * TODO: Переделать, перенести в массив какой-нибудь что-ли
     *
     * @returns {*}
     */
    getFileNameByProgrammingLanguage() {
        const language = this.config.programmingLanguage;

        if ('javascript' === language) {
            return 'main.js';
        } else if ('php' === language) {
            return 'main.php';
        } else if ('java' === language) {
            return 'Main.java';
        } else {
            throw new Error('Undefined programming language');
        }
    }

    /**
     * Этот метод создает файлы которые нужны для запуска кода
     * пользователя
     */
    createFiles() {
        let codeId = uuid();
        let codeDirectory = path.join(__dirname, '..', 'docker_code', codeId);

        return fsp.mkdir(codeDirectory)
            .then(() => {
                let fileName = path.join(codeDirectory, this.getFileNameByProgrammingLanguage());
                return fsp.writeFile(fileName, this.config.code);
            })
            .then(() => {
                let stdinText = this.config.stdin || '';
                return fsp.writeFile(path.join(codeDirectory, 'stdin.txt'), stdinText);
            })
            .then(() => {
                return new Promise((resolve) => resolve(codeDirectory));
            });
    }
}

/**
 * Этот класс запускает контейнер на исполнение кода
 * который прислал клиент
 */
class ShareCode extends EventEmitter {
    constructor(config) {
        super();

        this.lang = config.programmingLanguage;
        this.code_saver = new CodeSaver(config);
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
            .then(this.runDocker.bind(this));
    }

    /**
     * Запускает процесс докера и следит за его stdout и stderr, и сразу же их
     * транслирует на клиенсткую часть системы
     *
     * @param codeDirectory Папка с запускаемым кодом (чтобы прокинуть ее в контейнер)
     */
    runDocker(codeDirectory) {
        const runner = this.getRunnerName()
            , containerName = uuid();

        const proc = process.spawn('docker', ['run', '-v', `${codeDirectory}:/shared-code`, '--name', containerName, 'codeshare', `/runners/${runner}`]);

        proc.stdout.on('data', this._emitStdout.bind(this));
        proc.stderr.on('data', this._emitStdout.bind(this));

        proc.on('close', (exitCode) => {
            ShareCode._downDockerContainerAndRemoveCode(codeDirectory, containerName);
            this._emitStdout(`Process finished with: ${exitCode} status code`);
        });
    }

    /**
     * Вынес в отдельный метод чтобы не дублировать это внутри отлова событий
     *
     * @param data Данные из докера
     * @private
     */
    _emitStdout(data) {
        this.emit('docker-output', data.toString());
    }

    /**
     * Удаляем докер контейнер (чтобы не засирать память) и удаляем код с сервера
     * чтобы так же освободить ресурсы
     *
     * @param codeDirectory
     * @param containerName
     * @private
     */
    static _downDockerContainerAndRemoveCode(codeDirectory, containerName) {
        process.exec(`rm -r ${codeDirectory}`);
        process.exec(`docker rm ${containerName}`);
    }
}

module.exports = ShareCode;