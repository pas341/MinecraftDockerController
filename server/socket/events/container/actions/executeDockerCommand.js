var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig ;

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
        socket.on(`executeDockerCommand`, async (containerName, command, callback) => {
            try {
                let output = await dockerManager.executeCommand(containerName, command);
                await callback({ code: 200, output: output });
            } catch (error) {
                console.error(error);
                await callback({ code: 500, message: `Error executing command: ${error}` });
            }
        });
    },

}