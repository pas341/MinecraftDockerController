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
        socket.on(`systemInfo`, async (callback) => {
            let systemInfo = {
                cpu: {
                    model: systemUtils.getCpuModel(),
                    cpuCount: systemUtils.getCpuCount(),
                },
                os: {
                    name: systemUtils.getOperatingSystem(),
                    platform: systemUtils.getOsPlatform(),
                    version: systemUtils.getOsRelease(),
                    arch: systemUtils.getOsArch(),
                },
                memory: {
                    total: systemUtils.getMaxRam(),
                    free: systemUtils.getFreeRam(),
                },
            };
            await callback(systemInfo);
        });
    },

}