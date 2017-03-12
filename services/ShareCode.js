'use strict';

const fs = require('fs');
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
        return new Promise((resolve, reject) => {
            let codeId = uuid();
            let codeDirectory = path.join(__dirname, '..', 'docker_code', codeId);

            fs.mkdir(codeDirectory, () => {
                let fileName = path.join(codeDirectory, this.getFileNameByProgrammingLanguage());
                fs.writeFile(fileName, this.config.code, () => {
                    let stdinText = this.config.stdin || '';
                    fs.writeFile(path.join(codeDirectory, 'stdin.txt'), stdinText, () => {
                        // Возвращаем путь к папке с исходным кодом для запуска в контейнере
                        return resolve(codeDirectory);
                    });
                });
            });
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
            .then(this.runDocker.bind(this))
            .catch((err) => {
                console.log(err);
            });
    }

    /**
     * Запускает процесс доккера и следит за ним пока он выполняется, во
     * время выполнения читает его stdout
     *
     * @param codeDirectory
     */
    runDocker(codeDirectory) {
        let runner = this.getRunnerName();
        const command = `docker run -v ${codeDirectory}:/shared-code codeshare /runners/${runner}`;

        process.exec(command, (err, stdout) => {
            // Recursive remove code directory
            process.exec(`rm -r ${codeDirectory}`);

            this.emit('stdout', stdout);
        });
    }
}

module.exports = ShareCode;