var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const { get } = require('http');
const machineIdSync = require(`node-machine-id`).machineIdSync;

// Recursive function to get all files in folder and subfolders
function getAllFiles(dirPath, arrayOfFiles = []) {
    const files = fs.readdirSync(dirPath);
    files.forEach(function (file) {
        const fullPath = dirPath + '/' + file;
        if (fs.statSync(fullPath).isDirectory()) {
            getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });
    return arrayOfFiles;
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
        if (config.fsenabled) {


            socket.on(`listFiles`, async (folder, callback) => {
                try {
                    const fileList = getAllFiles(folder);
                    callback({ code: 200, content: fileList });
                } catch (err) {
                    callback({ code: 500, message: 'Error reading files', error: err.message });
                }
            });
        }
    },

}