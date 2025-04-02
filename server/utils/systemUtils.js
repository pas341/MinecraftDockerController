const { get } = require('http');
const os = require('os');

var util, config;

exports.systemUtils = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
    },
    getMaxRam: () => {
        return Math.round(os.totalmem() / (1024 ** 2)); // Ensure it returns a rounded number
    },
    getOperatingSystem: () => {
        return os.type();
    },
    getOsRelease: () => {
        return os.release();
    },
    getCpus: () => {
        return os.cpus();
    }

}