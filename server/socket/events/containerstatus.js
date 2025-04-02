var socket, identity, config, scripts, util, self, dockerManager, systemUtils;

const fs = require('fs');

exports.event = {
    init: async (scripts, socket) => {
        self = this.event;
        util = scripts.util;
        config = scripts.config.main;
        dockerManager = scripts.managers.docker;
        systemUtils = scripts.utils.system;
        identity = scripts.identity;
        socket = socket;
    },
    register: async (socket) => {
        socket.on(`containerstatus`, async (containername, callback) => {
            try {
                let statusRequest = await dockerManager.getContainerStatus(containername);
                if (statusRequest) {
                    if (statusRequest.code == 200) {
                        await callback({ code: 200, status: statusRequest.status });
                    } else {
                        await callback({ code: 9000, message: `error while getting container status` });
                    }
                } else {
                    await callback({ code: 9001, message: `error while getting container status` });
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error while getting container status` });
            }
        });
    },
}

