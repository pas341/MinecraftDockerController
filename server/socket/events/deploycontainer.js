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
        socket.on("deploycontainer", async (containerConfig, callback) => {
            try {
                console.log(`deploy: ${containerConfig.name}`);
                let container = await dockerManager.createContainer(containerConfig);
                await callback({ code: container.code, message: container.message });
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container deployment` });
            }
        });
    },

}