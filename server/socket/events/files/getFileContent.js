var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const { get } = require('http');
const machineIdSync = require(`node-machine-id`).machineIdSync;

exports.event = {
    init: async (s, socket, sc) => {
        scripts = s;
        self = this.event;
        util = scripts.util;
        config = scripts.config.main;
        dockerManager = scripts.managers.docker;
        systemUtils = scripts.utils.system;
        identity = scripts.identity;
        socketConfig = sc;
        socket = socket;
    },
    register: async (socket) => {
            socket.on(`getFileContent`, async (filePath, callback) => {
                if (!config.fsenabled) {
                    return callback({ code: 403, message: 'File management is disabled' });
                }
                fs.readFile(filePath, 'utf8', (err, data) => {
                    if (err) {
                        callback({ code: 500, message: 'Error reading file', error: err });
                    } else {
                        callback({ code: 200, content: data });
                    }
                });
            });
    },

}