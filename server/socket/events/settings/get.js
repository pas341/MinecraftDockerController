var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

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
        socket.on(`settings/get`, async (path, callback) => {
            if (typeof config[path] === 'undefined') {
                callback(config);
            }else {
                try {
                    const parts = String(path).split('.');
                    let value = config;
                    for (const part of parts) {
                        if (value == null || typeof value[part] === 'undefined') {
                            value = undefined;
                            break;
                        }
                        value = value[part];
                    }
                    callback(value);
                } catch (e) {
                    callback(undefined);
                }
            }
        });
    },
}