var socket, identity, config, scripts, util, self, dockerManager, systemUtils;

const fs = require('fs');

exports.event = {
    init: async (scripts, socket) => {
        console.log("Initializing systemInfo event"); // Debugging log
        self = this.event;
        util = scripts.util;
        config = scripts.config.main;
        dockerManager = scripts.managers.docker;
        systemUtils = scripts.utils.system;
        identity = scripts.identity;
        socket = socket;
    },
    register: async (socket) => {
        socket.on(`systemInfo`, async (callback) => {
            console.log("systemInfo event triggered"); // Debugging log
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