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
        socket.on(`isFileManagementEnabled`, async (callback) => {
            let isFileManagementEnabled = config.fsenabled;
            if (isFileManagementEnabled) {
                await callback({ code: 200, message: `File management is enabled`, enabled: isFileManagementEnabled });
            } else {
                await callback({ code: 200, message: `File management is disabled`, enabled: isFileManagementEnabled });
            }
        });
    },

}