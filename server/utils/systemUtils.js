const { get } = require('http');
const os = require('os');

var util, config;

exports.systemUtils = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
    },
    getMaxRam: () => {
        return (os.totalmem() / (1024 ** 3)).toFixed(2);
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