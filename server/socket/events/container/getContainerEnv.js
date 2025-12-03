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
        socket.on(`getcontainerenv`, async (containername ,callback) => {
            try {
                let container = await dockerManager.getContainer(containername);
                let containerInfo = await container.container.inspect();
                let containerConfig = containerInfo.Config;
                let env = containerConfig.Env;

                let envObj = {};
                if (Array.isArray(env)) {
                    env.forEach(item => {
                        let [key, ...val] = item.split('=');
                        envObj[key] = val.join('=');
                    });
                }
                await callback({ code: 200, env: envObj });
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error while getting container info file` });
            }
        });
    },

}