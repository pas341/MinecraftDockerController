var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const machineIdSync = require(`node-machine-id`).machineIdSync;

exports.event = {
    init: async (scripts, socket, sc) => {
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
        socket.on(`isEmulator`, async (callback) => {
            let isEmulator = scripts.settings.isEmulator;
            if (isEmulator) {
                await callback({ code: 200, message: `Running in emulator mode`, emulator: isEmulator });
            } else {
                await callback({ code: 200, message: `Not running in emulator mode`, emulator: isEmulator });
            }
        });
    },

}