var scripts, util, self;

const net = require('net');
const os = require('os');

exports.scanner = {
    init: async (scripts) => {
        util = scripts.util;
        scripts = scripts;
        self = this.scanner;
    },
    scanPort: async (ip, port) => {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            socket.setTimeout(2000);
            socket.on('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                socket.destroy();
                resolve(false);
            });
            socket.on('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(port, ip);
        });
    },
    scanNetwork: async (port) => {
        const promises = [];
        const results = [];
        const interfaces = os.networkInterfaces();

        for (const iface of Object.values(interfaces)) {
            for (const config of iface) {
            if (config.family === 'IPv4' && !config.internal) {
                const subnet = config.address.split('.').slice(0, 3).join('.');
                for (let i = 1; i <= 254; i++) {
                const ip = `${subnet}.${i}`;
                promises.push(
                    self.scanPort(ip, port).then((isOpen) => {
                    if (isOpen) {
                        results.push(ip);
                    }
                    })
                );
                }
            }
            }
        }

        await Promise.all(promises);
        return results;
    },
    scanNetworkPreferedPrefixed: async (port, prefix) => {
        let addresses = await self.scanNetwork(port);
        let output = [];
        for (let i = 0; i < addresses.length; i++) {
            let address = addresses[i];
            if (address.startsWith(prefix)) {
                output.push(address);
            }
        }
        return output;
    }
};