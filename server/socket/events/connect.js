var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const machineIdSync = require(`node-machine-id`).machineIdSync;

exports.event = {
    init: async (scripts, socket, sc) => {
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
        socket.on(`connect`, async () => {
            const machineid = machineIdSync(true);
            socket.emit(`serverregister`, { setup: config.setup, machineid: machineid, license: config.license.key }, async (response) => {
                if (response.code == 201) {
                    if (fs.existsSync(`${process.cwd()}/data/token.txt`)) {
                        socket.emit(`identify`, { identity: fs.readFileSync(`${process.cwd()}/data/token.txt`, `utf-8`), machineid: machineid });
                    } else if (response.code == 200) {
                        socket.emit(`identify`, { identity: response.token, machineid: machineid });
                    } else {
                        console.log(`Server Token missing for server please contact the tool developer`);
                        socket.disconnect(true);
                        process.exit(-1);
                    }
                } else {
                    socket.disconnect(true);
                    process.exit(-1);
                }
            });
            console.log(` [${identity}] ${util.prettyDate()} : [INFO] : Connected to Server: ${socketConfig.name}`);
        });
    },

}