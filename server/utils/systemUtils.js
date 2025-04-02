const { get } = require('http');
const os = require('os');
const { execSync } = require('child_process');

var util, config;

exports.systemUtils = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
    },
    getMaxRam: () => {
        try {
            const totalMem = execSync('wmic OS get TotalVisibleMemorySize /Value', { encoding: 'utf8' });
            const match = totalMem.match(/TotalVisibleMemorySize=(\d+)/);
            if (match) {
                return Math.round(parseInt(match[1], 10) / 1024); // Convert KB to MB
            }
            throw new Error('Unable to parse memory size');
        } catch (error) {
            console.error('Error fetching total memory using command:', error);
            return 2048; // Default to 2GB if the command fails
        }
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