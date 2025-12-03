var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const { exec } = require('child_process');
exports.event = {
    init: async (scripts, socket, so) => {
        self = this.event;
        util = scripts.util;
        config = scripts.config.main;
        dockerManager = scripts.managers.docker;
        systemUtils = scripts.utils.system;
        identity = scripts.identity;
        socketConfig = so;
        socket = socket;
    },
    register: async (socket) => {
        socket.on(`system/remoteupdate`, async (callback) => {
            try {

                // Run git pull in the base directory
                exec('git pull', { cwd: process.cwd() }, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`git pull error: ${error.message}`);
                        res.status(500).json({ error: 'Failed to update backend', details: error.message });
                        return;
                    }
                    console.log(`git pull stdout: ${stdout}`);
                    if (stderr) console.error(`git pull stderr: ${stderr}`);
                    res.status(200).json({ message: 'remote updated successfully', output: stdout });
                });
                
                await callback({ code: 200, message: `System update initiated. Server will restart shortly.` });
                setTimeout(() => {
                    process.exit(0);
                }, 500);
            } catch (e) {
                console.error(e);
                await callback({ code: 1, message: `error during system update` });
            }
        });
    },

}