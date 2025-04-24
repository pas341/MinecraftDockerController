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
        socket.on(`removecontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Deleting: ${containername}`);
                    let container = containerRequest.container;
                    await container.remove().then(async () => { await callback({ code: 200, message: `container removed` }) });
                    console.log(`${containername}: removed`);
                } else {
                    await callback({ code: 12, message: `cannot find container by name: ${containername}` });
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container shutdown` });
            }
        });
    },

}