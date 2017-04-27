const CodeSaver = require('../../modules/sharing/code-saver.sharing');

describe('Test "CodeSaver" class', () => {
    it('Сheck main files', () => {
        const configs = [
            {
                language: 'javascript',
                actual: 'main.js'
            },
            {
                language: 'java',
                actual: 'Main.java'
            },
            {
                language: 'php',
                actual: 'main.php'
            },
            {
                language: 'python',
                actual: 'main.py'
            }
        ];

        for (const dataSet of configs) {
            const codeSaver = new CodeSaver({
                programmingLanguage: dataSet.language
            });

            const mainFile = codeSaver.getFileNameByProgrammingLanguage();
            expect(mainFile).toEqual(dataSet.actual);
        }
    });

    it('Should be exception if unknown language', () => {
        const codeSaver = new CodeSaver({
            programmingLanguage: 'jingobels'
        });

        expect(codeSaver.getFileNameByProgrammingLanguage).toThrow();
    });

    it ('Should be save code', () => {

    })
});