var socket, identity, config, scripts, util, self, dockerManager;
const io = require(`socket.io-client`);
const machineId = require(`node-machine-id`).machineId;
const machineIdSync = require(`node-machine-id`).machineIdSync;
const fs = require(`fs`);
const { exec, execSync } = require('child_process');

function isWindows() {
    return process.platform === 'win32';
}

function showPopupMessage(message, title = 'Message') {
    if (!isWindows()) {
        console.log(` [${identity}] ${util.prettyDate()} : [INFO] : [Popup] : ${title} : ${message}`);
        return;
    }
    const command = `powershell -command "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('${message}', '${title}')"`;
    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            return;
        }
        console.log(`Stdout: ${stdout}`);
    });
}

function preventPM2Restart() {
    const command = `pm2 stop ${process.env.name}`;
    const listCommand = `pm2 list | grep ${process.env.name}`;
    try {
        execSync(listCommand, { stdio: 'inherit' });
    } catch (error) {
        console.log(`Application ${process.env.name} is not running under PM2.`);
        return;
    }
    execSync(command, { stdio: 'inherit' });
}

function showPopupAndWait(message, title) {
    if (!isWindows()) {
        console.log(` [${identity}] ${util.prettyDate()} : [INFO] : [Popup] : ${title} : ${message}`);
        return;
    }
    const command = `powershell -command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', 'OK', 'Error')}"`;
    execSync(command, { stdio: 'inherit' });
}

exports.so = {
    init: async (s, socketConfig) => {
        self = this.so;
        scripts = s;
        config = s.config.main;
        if (fs.existsSync(`${process.cwd()}/data/token.txt`)) {
            identity = fs.readFileSync(`${process.cwd()}/data/token.txt`, `utf-8`);
        }
        util = s.util;
        dockerManager = s.managers.docker;

        socket = io(`${socketConfig.server}:${socketConfig.port}`, { transports: ["websocket"], autoConnect: false, rejectUnauthorized: false });
        self.registerListeners();
    },
    registerListeners: async () => {
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
            console.log(` [${identity}] ${util.prettyDate()} : [INFO] : Connected to Main Server`);
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

        socket.on(`startcontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Starting: ${containername}`);
                    let container = containerRequest.container;
                    await container.start().then(async () => { await callback({ code: 200, message: `container started` }) });
                    console.log(`${containername}: stopped`);
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container shutdown` });
            }
        });

        socket.on("deploycontainer", async (containerConfig, callback) => {
            try {
                console.log(`deploy: ${containerConfig.name}`);
                let container = await dockerManager.createContainer(containerConfig);
                await callback({ code: container.code, message: container.message });
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container deployment` });
            }
        });

        socket.on(`containerexists`, async (containername, callback) => {
            await callback(await dockerManager.doesContainerExist(containername));
        });

        socket.on(`stopcontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Stopping: ${containername}`);
                    let container = containerRequest.container;
                    await container.stop().then(async () => { await callback({ code: 200, message: `container stopped` }) });
                    console.log(`${containername}: stopped`);
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container shutdown` });
            }
        });

        socket.on(`deletecontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Deleting: ${containername}`);
                    let container = containerRequest.container;
                    await container.delete().then(async () => { await callback({ code: 200, message: `container deleted` }) });
                    console.log(`${containername}: deleted`);
                }else{
                    await callback({ code: 12, message: `cannot find container by name: ${containername}` });
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container shutdown` });
            }
        });

        socket.on(`stopanddeletecontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Stopping: ${containername}`);
                    let container = containerRequest.container;
                    await container.stop().then(con => con.delete()).then(async () => { await callback({ code: 200, message: `container stopped and deleted` }) });
                    console.log(`${containername}: stopped and deleted`);
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container shutdown` });
            }
        });

        socket.on(`restartcontainer`, async (containername, callback) => {
            try {
                let containerRequest = await dockerManager.getContainer(containername);
                if (containerRequest.code == 200) {
                    console.log(`Stopping: ${containername}`);
                    let container = containerRequest.container;
                    await container.restart().then(async () => { await callback({ code: 200, message: `container restarting` }) });
                    console.log(`${containername}: restarted`);
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error durring container restart` });
            }
        });

        socket.on(`containerstatus`, async (containername, callback) => {
            try {
                let statusRequest = await dockerManager.getContainerStatus(containername);
                if (statusRequest) {
                    if (statusRequest.code == 200) {
                        await callback({ code: 200, status: statusRequest.status.data });
                    } else {
                        await callback({ code: 9000, message: `error while getting container status` });
                    }
                } else {
                    await callback({ code: 9001, message: `error while getting container status` });
                }
            } catch (e) {
                console.error(e);
                await callback({ code: 5000, message: `error while getting container status` });
            }
        });

        socket.on(`message`, async (message) => {
            showPopupMessage(message, "Message from Server");
        });

        socket.on(`popup`, async (message, title) => {
            showPopupMessage(message, title);
        });
    },
    connect: async () => {
        socket.open();
        await new Promise((resolve) => {
            socket.once(`identconfirmed`, async (response) => {
                console.log(` [${identity}] : [INFO] : Socket ready for use`);
                console.log(`\n \nLicense Info`);
                console.log(`-------------------------------------------`);
                if (response.code == 200) {
                    console.log(`License holder: ${response.holder}`);
                    console.log(`License status: ${response.status}`);
                    console.log(`Max physical servers: ${response.maxservers}`);
                    if (response.serversavalible != null) {
                        console.log(`Remaining physical servers: ${response.serversavalible}`);
                    }
                    console.log(`Max virtual servers: ${response.maxcontainers}`);
                    if (response.containersavalible != null) {
                        console.log(`Remaining virtual servers: ${response.containersavalible}`);
                    }
                } else if (response.code == 4253) {
                    showPopupAndWait("Invalid License", "License Error");
                    console.log(response.message);
                    console.log(`-------------------------------------------`);
                    preventPM2Restart();
                } else {
                    console.log(response);
                }
                if (response.code == 4258) {
                    showPopupAndWait("License Disabled by the provider", "License Error");
                    console.log(`-------------------------------------------`);
                    preventPM2Restart();
                }
                console.log(`-------------------------------------------`);
                console.log(`\n \n`);
                resolve();
            });
            socket.once(`registerfinished`, async (response) => {
                const machineid = machineIdSync(true);
                if (response.code == 200) { // valid first register
                    if (response.token) {
                        fs.writeFileSync(`${process.cwd()}/data/token.txt`, response.token);
                    }
                } else if (response.code == 201) { // valid allready registered
                    if (fs.existsSync(`${process.cwd()}/data/token.txt`)) {
                        let token = fs.readFileSync(`${process.cwd()}/data/token.txt`, `utf-8`);
                        socket.emit(`identify`, { identity: token, machineid: machineid }); // required for socket server to know who the server is...
                    } else {
                        console.log(`Server Token missing for server please contact the tool developer`);
                        socket.disconnect(true);
                        await util.sleep(60 * 1000 * 5);
                        process.exit(-1);
                    }
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

