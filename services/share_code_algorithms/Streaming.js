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
        }
    }

    /**
     * @param emitter Класс который посылает события
     * @param codeDirectory Директория с кодом (чтобы опрокинуть ее в контейнер)
     * @param runner раннер который должен запускать код
     * @param containerName имя контейнера
     * @param afterDown что должно выполниться после завершения работы контейнера
     */
    runDocker(emitter, codeDirectory, runner, containerName, afterDown) {
        const process = spawn('docker', ['run', '-v', `${codeDirectory}:/shared-code`, '--name', containerName, 'codeshare', `/runners/${runner}`]);

        process.stdout.on('data', Streaming._emitData.bind(this, emitter));
        process.stderr.on('data', Streaming._emitData.bind(this, emitter));

        process.on('close', (exitCode) => {
            emitter.emitOutput(this.exitCodes[exitCode] || 'Unknown completion code');

            if (afterDown && 'function' === typeof afterDown) {
                return afterDown(codeDirectory, containerName, exitCode);
            }
        });
    }

    static _emitData(emitter, data) {
        emitter.emitOutput(data.toString());
    }
}

module.exports = Streaming;