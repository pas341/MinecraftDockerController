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
        socket.on(`getcontainers`, async (skipMemory, callback) => {
            try {
                let containers = await dockerManager.getContainers();
                let output = [];

                for (let container of containers) {
                    let id = container.Id || container.Names[0].replace(`/`, ``);
                    let names = container.Names;
                    let state = container.State;
                    let status = container.Status;

                    
                    let memoryUsage = 0;
                    if (!skipMemory) {
                        // force skipMemory
                        //memoryUsage = await dockerManager.getMemoryUsage(names[0].replace(`/`, ``)); // removed for performance
                        if (memoryUsage) {
                            memoryUsage = memoryUsage.memoryUsage;
                        } else {
                            memoryUsage = `0`;
                        }
                    }else{
                        memoryUsage = `0`;
                    }
                    let obj = {id: id, name: names[0].replace(`/`, ``), state: state, status: status, memoryUsage: memoryUsage};
                    obj.memoryUsage = memoryUsage;
                    output.push(obj);
                }

                await callback(output);
            } catch (error) {
                console.error(`Error getting containers:`, error);
                await callback({ error: `Failed to get containers.` });
            }
        });
    },

}