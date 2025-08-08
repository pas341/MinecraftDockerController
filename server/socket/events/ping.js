var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const { get } = require('http');
const machineIdSync = require(`node-machine-id`).machineIdSync;

Date.prototype.getUTCTime = function () {
    return this.getTime() - (this.getTimezoneOffset() * 60000);
};

exports.event = {
    init: async (s, socket, sc) => {
        scripts = s;
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
        socket.on(`ping`, async (start, callback) => {
            let currentTime = new Date().getUTCTime();
            console.log(`start: ${start}`);
            console.log(`ping received at: ${currentTime}`);
            callback({ code: 200, message: `pong`, timestamp: new Date().toISOString(), receiveTime: currentTime, timeOffset: new Date().getTimezoneOffset() });
        });
    },

}