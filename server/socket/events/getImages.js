var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const machineIdSync = require(`node-machine-id`).machineIdSync;

exports.event = {
    init: async (scripts, socket, sc) => {
        self = this.event;
        util = scripts.util;
        config = scripts.config.main;
        dockerManager = scripts.managers.docker;
        systemUtils = scripts.utils.system;
        identity = scripts.identity;
        socketConfig = sc;
        socket = socket;
    },
    register: async (socket) => {
        socket.on(`getImages`, async (callback) => {
            let imagesRequest = await dockerManager.getImages();
            if (imagesRequest.code !== 200) {
                await callback({ code: imagesRequest.code, message: imagesRequest.message });
                return;
            }else{
                callback({ code: 200, images: imagesRequest.images });
            }
        });
    },

}