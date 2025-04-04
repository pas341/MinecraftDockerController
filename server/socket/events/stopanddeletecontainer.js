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
        socket.on(`stopandremovecontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Stopping: ${containername}`);
                    let container = containerRequest.container;
                    await container.stop().then(con => con.remove()).then(async () => { await callback({ code: 200, message: `container stopped and removed` }) });
                    console.log(`${containername}: stopped and removed`);
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container shutdown` });
            }
        });
    },

}