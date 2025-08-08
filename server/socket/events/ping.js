var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const { get } = require('http');
const machineIdSync = require(`node-machine-id`).machineIdSync;

function getUTCNow()
{
    var now = new Date();
    var time = now.getTime();
    var offset = now.getTimezoneOffset();
    offset = offset * 60000;
    return time - offset;
}

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
            let currentTime = getUTCNow();
            console.log(`start: ${start}`);
            console.log(`ping received at: ${currentTime}`);
            console.log(`currentPing: ${currentTime - start}`);
            callback({ code: 200, message: `pong`, timestamp: new Date().toISOString(), receiveTime: currentTime - start });
        });
    },

}