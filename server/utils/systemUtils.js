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
    getOsPlatform: () => {
        return os.platform();
    },
    getOsArch: () => {
        return os.arch();
    },
    getCpus: () => {
        return os.cpus();
    },
    getCpuCount: () => {
        return os.cpus().length;
    },
    getCpuModel: () => {
        return os.cpus()[0].model;
    },
    getCpuSpeed: () => {
        return os.cpus()[0].speed;
    },
    getMaxRam: () => {
        return os.totalmem();
    },
    getFreeRam: () => {
        return os.freemem();
    },
    getSystemUptime: () => {
        return os.uptime();
    },
    getSystemStatus: () => {
        return {
            os: {
                type: os.type(),
                platform: os.platform(),
                release: os.release(),
                arch: os.arch(),
            },
            uptime: os.uptime(),
            loadavg: os.loadavg(),
            totalmem: os.totalmem(),
            freemem: os.freemem(),
            cpus: os.cpus(),
            cpu: {
                model: os.cpus()[0].model,
                speed: os.cpus()[0].speed,
                count: os.cpus().length,
            },
        };
    },
}