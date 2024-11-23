var socket, identity, config, scripts, util, self, dockerManager;
const io = require(`socket.io-client`);
const machineId = require(`node-machine-id`).machineId;
const machineIdSync = require(`node-machine-id`).machineIdSync;
const fs = require(`fs`);

exports.so = {
    init: async (s, socketConfig) => {
        self = this.so;
        scripts = s;
        config = s.config.main;
        if (fs.existsSync(`${process.cwd()}/data/token.txt`)) {
            identity = fs.readFileSync(`${process.cwd()}/data/token.txt`);
        }
        util = s.util;
        dockerManager = s.managers.docker;

        socket = io(`${socketConfig.server}:${socketConfig.port}`, { transports: ["websocket"], autoConnect: false, rejectUnauthorized: false });
        self.registerListeners();
    },
    registerListeners: async () => {
        socket.on(`connect`, async () => {
            const machineid = machineIdSync(true);
            socket.emit(`serverregister`, {setup: config.setup, machineid: machineid, license: config.license.key}, async (response) => {
                if (response.code == 201) {
                    socket.emit(`identify`, { identity: fs.readFileSync(`${process.cwd()}/data/token.txt`), machineid: machineid});
                }else{
                    socket.disconnect(true);
                }
            });
            console.log(` [${identity}] ${util.prettyDate()} : [INFO] : Connected to Main Server` );
        });
        socket.on("disconnect", (reason) => {
            disconnected = 1;
            console.log(`socket disconnected:\n${reason}`);
            //console.log(` [${identity}] ${util.prettyDate()} : [Warning] : socket disconnect: ${reason}`);
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

        socket.on(`containerexists`, async (containername, callback) => {
            await callback(await dockerManager.doesContainerExist(containername));
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

        socket.on(`containerstatus`, async (containername, callback) => {
            try {
                let statusRequest = await dockerManager.getContainerStatus(containername);
                if (statusRequest) {
                    if (statusRequest.code == 200) {
                        await callback({code: 200, status: statusRequest.status.data});
                    }else{
                        await callback({code: 9000, message: `error while getting container status`});
                    }
                }else{
                    await callback({code: 9001, message: `error while getting container status`});
                }
            }catch(e) {
                console.error(e);
                await callback({code: 5000, message: `error while getting container status`});
            }
        });

    },
    connect: async () => {
        socket.open();
        await new Promise((resolve) => {
            socket.once(`identconfirmed`, (response) => {
                console.log(` [${identity}] : [INFO] : Socket ready for use`);
                console.log(`License Info`);
                console.log(`-------------------------------------------`);
                console.log(response);
                console.log(`-------------------------------------------`);
                resolve();
            });
            socket.once(`registerfinished`, (response) => {
                const machineid = machineIdSync(true);
                if (response.code == 200) { // valid first register
                    if (response.token) {
                        fs.writeFileSync(`${process.cwd()}/data/token.txt`, response.token);
                        socket.emit(`identify`, { identity: response.token, machineid: machineid}); // required for socket server to know who the server is...
                    }
                }else if (response.code == 201) { // valid allready registered
                    let token = fs.readFileSync(`${process.cwd()}/data/token.txt`);
                    socket.emit(`identify`, { identity: token, machineid: machineid}); // required for socket server to know who the server is...
                }
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
