const { get } = require('http');
const os = require('os');

var util, config;

exports.systemUtils = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
    },
    getMaxRam: () => {
        return Math.floor(os.totalmem() / (1024 ** 3));
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