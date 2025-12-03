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
        socket.on(`restartcontainer`, async (containername, callback) => {
            try {
                await dockerManager.restartContainer(containername, callback);
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error during container restart` });
            }
        });
    },
}
