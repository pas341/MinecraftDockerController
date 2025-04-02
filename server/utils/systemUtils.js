const { get } = require('http');
const os = require('os');
const { execSync } = require('child_process');

var util, config;

exports.systemUtils = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
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