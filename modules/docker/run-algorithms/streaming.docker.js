'use strict';

const spawn = require('child_process').spawn;

/**
 * Этот алгоритм отличается тем, что он может стримить результат в реальном
 * времени не дожидаясь полного завершения выполнения докер процесса
 */
class Streaming {

    constructor() {
        this.exitCodes = {
            0: 'The process was completed successfully',
            143: 'The process was stopped due to timeout'
        };

        this.stringBuffer = '';
    }

    /**
     * @param emitter Класс который посылает события
     * @param codeDirectory Директория с кодом (чтобы опрокинуть ее в контейнер)
     * @param runner раннер который должен запускать код
     * @param containerName имя контейнера
     * @param dockerImageName имя образа docker контейнера
     * @param afterDown что должно выполниться после завершения работы контейнера
     */
    runDocker(emitter, codeDirectory, runner, containerName, dockerImageName, afterDown) {
        const process = spawn('docker', ['run', '-v', `${codeDirectory}:/shared-code`, '--rm', '--name', containerName, dockerImageName, `/runners/${runner}`]);

        process.stdout.on('data', this._bufferingData.bind(this));
        process.stderr.on('data', this._bufferingData.bind(this));

        process.on('close', (exitCode) => {
            emitter.emitOutput(this.stringBuffer + '\n');
            emitter.emitOutput(this.exitCodes[exitCode] || 'Unknown completion code');

            if (afterDown && 'function' === typeof afterDown) {
                return afterDown(codeDirectory, containerName, exitCode);
            }
        });
    }

    /**
     * Это буферизированный output, посылает данные на клиента только тогда, когда
     * накопилось определенное количество данных, чтобы не затравить клиентскую часть
     * данными, проблема с зависанием браузера
     *
     * @param data
     * @private
     */
    _bufferingData(data) {
        this.stringBuffer += data.toString();
    }
}

module.exports = Streaming;