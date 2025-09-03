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
        socket.on(`isFileHandlingEnabled`, async (start, callback) => {
            callback({ code: 200, value: config.fsenabled === true });
        });
    },

}