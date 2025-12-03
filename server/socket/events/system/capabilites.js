var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');

exports.event = {
    init: async (scripts, socket, so) => {
        self = this.event;
        util = scripts.util;
        config = scripts.config.main;
        dockerManager = scripts.managers.docker;
        systemUtils = scripts.utils.system;
        identity = scripts.identity;
        socketConfig = so;
        socket = socket;
    },
    register: async (socket) => {
        socket.on(`system/capabilities`, async (callback) => {
            const isFileManagementEnabled = config.fsenabled;
            const capabilities = {
                fileManagement: isFileManagementEnabled,
                autoUpdate: true
            };
            await callback({ code: 200, message: `System capabilities fetched`, capabilities: capabilities });
        });
    },

}