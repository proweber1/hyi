'use strict';

module.exports = {
    connections: {
        redis: {
            host: '127.0.0.1',
            port: 6379,
            db: 0
        }
    },
    modules: {
        socket: {
            socketSecurityOrigins: null,
        },
        docker: {
            imageName: 'codeshare',
            // Inner docker process timeout in seconds
            processTimeout: 5
        },
        sharing: {
            codePath: './docker_code',
            languageFileNames: {
                java: 'Main.java',
                javascript: 'Main.js',
                php: 'main.php',
                python: 'main.py'
            }
        }
    },
    settings: {
        defaultClientSettings: {
            languages: 'javascript',
            tabSize: 4
        }
    }
};
