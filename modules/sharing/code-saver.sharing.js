'use strict';

const fsp = require('fs-promise');
const path = require('path');
const uuid = require('uuid/v4');
const applicationConfig = require('../../config/application');

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
     * @returns {*}
     */
    getFileNameByProgrammingLanguage() {
        const language = this.config.programmingLanguage;
        const languageFileNames = applicationConfig.modules.sharing.languageFileNames;

        if (!languageFileNames.hasOwnProperty(language)) {
            throw new Error('Undefined language');
        }

        return languageFileNames[language];
    }

    /**
     * Этот метод создает файлы которые нужны для запуска кода
     * пользователя
     */
    createFiles() {
        const codeId = uuid();
        const codeDirectory = path.join(__dirname, '..', 'docker_code', codeId);

        return fsp.mkdir(codeDirectory)
            .then(() => {
                return fsp.writeFile(
                    path.join(codeDirectory, this.getFileNameByProgrammingLanguage()),
                    this.config.code
                );
            })
            .then(() => {
                return fsp.writeFile(
                    path.join(codeDirectory, 'stdin.txt'),
                    this.config.stdin || ''
                );
            })
            .then(() => codeDirectory);
    }
}

module.exports = CodeSaver;