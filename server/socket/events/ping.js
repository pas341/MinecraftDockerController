var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
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
        socket.on(`ping`, async (start, callback) => {
            let currentTime = new Date().getTime();
            console.log(currentTime - start);
            callback({ code: 200, message: `pong`, timestamp: new Date().toISOString(), receiveTime: currentTime - start });
        });
    },

}