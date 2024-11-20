var socket, identity, config, scripts, util, self, dockerManager;
const io = require(`socket.io-client`);



exports.so = {
    init: async (s, socketConfig) => {
        self = this.so;
        scripts = s;
        config = s.config.main;
        identity = config.server.servertoken;
        util = s.util;
        dockerManager = s.managers.docker;

        socket = io(`${socketConfig.server}:${socketConfig.port}`, { transports: ["websocket"], autoConnect: false, rejectUnauthorized: false });
        self.registerListeners();
    },
    registerListeners: async () => {
        socket.on(`connect`, async () => {
            socket.emit(`identify`, { identity: identity}); // required for socket server to know who the server is...
            console.log(` [${identity}] ${util.prettyDate()} : [INFO] : Connected to Main Server` );
        });
        socket.on("disconnect", (reason) => {
            disconnected = 1;
            console.log(` [${identity}] ${util.prettyDate()} : [Warning] : socket disconnect: ${reason}`);
        });
        socket.on("error", (error) => {
            console.log(` [${identity}] ${util.prettyDate()} : [ERROR] : [SOCKET ERROR]: ${error}`);
            console.error(error);
        });

        socket.on("startcontainer", async (containerConfig, callback) => {
            try {
                console.log(`starting: ${containerConfig.name}`);
                let container = await dockerManager.createContainer(containerConfig);
                await callback({code: container.code, message: container.message});
            }catch (e) {
                console.error(e);
                await callback({code: 5000, message: `error durring container startup`});
            }
        });

        socket.on(`stopanddeletecontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Stopping: ${containername}`);
                    let container = containerRequest.container;
                    await container.stop().then(con => con.delete()).then(async () => {await callback({code: 200, message: `container stopped and deleted`})});
                    console.log(`${containername}: stopped and deleted`);
                }
            }catch (e) {
                console.error(e);
                await callback({code: 5000, message: `error durring container shutdown`});
            }
        });

        socket.on(`restartcontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Stopping: ${containername}`);
                    let container = containerRequest.container;
                    await container.restart().then(async () => {await callback({code: 200, message: `container restarting`})});
                    console.log(`${containername}: stopped and deleted`);
                }
            }catch (e) {
                console.error(e);
                await callback({code: 5000, message: `error durring container restart`});
            }
        });

    },
    connect: async () => {
        socket.open();
        await new Promise((resolve) => {
            socket.once(`identconfirmed`, () => {
                console.log(` [${identity}] : [INFO] : Socket ready for use`);
                resolve();
            });
            socket.once("connect_error", (error) => {
                console.log(` [${identity}] : [ERROR] : [SOCKET ERROR]: ${error}`);
                console.error(error);
                resolve();
            });
        });
    },
    disconnect: async () => {
        socket.disconnect();
    },
    getSocket: () => {
        return socket;
    },
};
