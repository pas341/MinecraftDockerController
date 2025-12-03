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
        socket.on(`settings/update`, async (path, value, callback) => {
            if (typeof config[path] === 'undefined') {
                return callback({ code: 400, message: 'Invalid setting' });
            }
            // allow dot-paths or array paths, e.g. "a.b.c" or ["a","b","c"]
            const parts = Array.isArray(path) ? path.slice() : String(path).split('.');
            if (parts.length === 0) return callback({ code: 400, message: 'Invalid setting' });

            // traverse to parent of final key
            let target = config;
            for (let i = 0; i < parts.length - 1; i++) {
                const key = parts[i];
                if (typeof target[key] === 'undefined' || target[key] === null) {
                    return callback({ code: 400, message: 'Invalid setting' });
                }
                // ensure we can traverse into this segment
                if (typeof target[key] !== 'object') {
                    return callback({ code: 400, message: 'Invalid setting' });
                }
                target = target[key];
            }

            const finalKey = parts[parts.length - 1];
            if (typeof target[finalKey] === 'undefined') {
                return callback({ code: 400, message: 'Invalid setting' });
            }

            // update and return old/new values
            const oldValue = target[finalKey];
            target[finalKey] = value;
            await callback(null, { code: 200, oldValue, newValue: value });
            scripts.config.save();
        });
    },
}