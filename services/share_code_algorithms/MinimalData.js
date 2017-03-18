'use strict';

const exec = require('child_process').exec;

/**
 * Этот алгоритм отличается тем, что он минимизирует сетевые операции, в отличии
 * от алгоритма стриминга, он дожидается полного завершения выполнения контейнера, а
 * потом уже отправляет результаты на клиента
 */
class MinimalData {

    /**
     * @param emitter Класс который посылает события
     * @param codeDirectory Директория с кодом (чтобы опрокинуть ее в контейнер)
     * @param runner раннер который должен запускать код
     * @param containerName имя контейнера
     * @param afterDown что должно выполниться после завершения работы контейнера
     */
    runDocker(emitter, codeDirectory, runner, containerName, afterDown) {
        exec(`docker run -v ${codeDirectory}:/shared-code --name ${containerName} codeshare /runners/${runner}`, (err, stdout, stderr) => {
            emitter.emitOutput(stdout);
            emitter.emitOutput(stderr);

            if (afterDown && 'function' === typeof afterDown) {
                return afterDown(codeDirectory, containerName);
            }
        });
    }
}

module.exports = MinimalData;