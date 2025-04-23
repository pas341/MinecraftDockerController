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
        socket.on(`getrunningcontainers`, async (callback) => {
            try {
                let containersReq = await dockerManager.getRunningContainers();
                let output = [];
                
                for (let container of containersReq.containers) {
                    let names = container.Names;
                    let state = container.State;
                    let status = container.Status;
                    let obj = {name: names[0].replace(`/`, ``), state: state, status: status};
                    output.push(obj);
                }
                
                await callback(output);
            } catch (error) {
                console.error(`Error getting running containers:`, error);
                await callback({error: `Failed to get running containers.`});
            }
        });
    },

}