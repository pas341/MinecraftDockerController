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
        if (config.fsenabled) {
            socket.on(`deleteFile`, async (filePath, callback) => {
                fs.unlink(filePath, (err) => {
                    if (err) {
                        callback({ code: 500, message: 'Error deleting file', error: err });
                    } else {
                        callback({ code: 200, message: 'File deleted successfully' });
                    }
                });
            });
        }
    },

}