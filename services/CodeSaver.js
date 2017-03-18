'use strict';

const fsp = require('fs-promise');
const path = require('path');
const uuid = require('uuid/v4');

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

module.exports = CodeSaver;