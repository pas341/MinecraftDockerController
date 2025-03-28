var socket, identity, config, scripts, util, self, dockerManager;
const io = require(`socket.io-client`);
const machineId = require(`node-machine-id`).machineId;
const machineIdSync = require(`node-machine-id`).machineIdSync;
const fs = require(`fs`);
const { exec, execSync } = require('child_process');

const commandSessions = {};

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
    const command = `powershell -windowstyle hidden -command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::EnableVisualStyles(); $form = New-Object System.Windows.Forms.Form; $form.WindowState = 'Minimized'; $form.ShowInTaskbar = $false; [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', 'OK', 'Error')}"`;
    execSync(command, { stdio: 'inherit' });
}

function showErrorPopup(message, title = 'Error') {
    if (!isWindows()) {
        console.log(` [${identity}] ${util.prettyDate()} : [ERROR] : [Popup] : ${title} : ${message}`);
        return;
    }
    const command = `powershell -windowstyle hidden -command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::EnableVisualStyles(); [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)}"`;
    execSync(command, { stdio: 'inherit' });
}

function showWarningPopup(message, title = 'Warning') {
    if (!isWindows()) {
        console.log(` [${identity}] ${util.prettyDate()} : [WARNING] : [Popup] : ${title} : ${message}`);
        return;
    }
    const command = `powershell -windowstyle hidden -command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::EnableVisualStyles(); [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)}"`;
    execSync(command, { stdio: 'inherit' });
}

function showInfoPopup(message, title = 'Info') {
    if (!isWindows()) {
        console.log(` [${identity}] ${util.prettyDate()} : [INFO] : [Popup] : ${title} : ${message}`);
        return;
    }
    const command = `powershell -windowstyle hidden -command "& {Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Application]::EnableVisualStyles(); [System.Windows.Forms.MessageBox]::Show('${message}', '${title}', [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)}"`;
    execSync(command, { stdio: 'inherit' });
}

function runCommand(command) {
    const options = { shell: isWindows() ? 'powershell.exe' : undefined, windowsHide: true };
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error.message}`);
                return reject(error.message);
            }
            if (stderr) {
                console.error(`Stderr: ${stderr}`);
            }
            console.log(`Stdout: ${stdout}`);
            resolve(stdout.trim());
        });
    });
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
                    console.log(`${containername}: started`);
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
                    await container.remove().then(async () => { await callback({ code: 200, message: `container deleted` }) });
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
                        await callback({ code: 200, status: statusRequest.status });
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

        socket.on(`getlogs`, async (containername, callback) => {
            let logs = await dockerManager.getLogs(containername);
            await callback(logs);
        });

        socket.on(`getlogspage`, async (containername, page, perPage, callback) => {
            let logs = await dockerManager.getLogsPaginated(containername, page, perPage);
            await callback(logs);
        });

        socket.on(`getcontainers`, async (callback) => {
            let containers = await dockerManager.getContainers();
            let output = [];
            

            for (let container of containers) {
                let names = container.Names;
                let state = container.State;
                let status = container.Status;
                let obj = {name: names[0].replace(`/`, ``), state: state, status: status};
                output.push(obj);
            }

            await callback(output);
        });

        socket.on(`message`, async (message) => {
            showPopupMessage(message, "Message from Server");
        });

        socket.on(`popup`, async (message, title, type) => {
            console.log(` [${identity}] ${util.prettyDate()} : [INFO] : [Popup] : [TYPE] : ${title} : ${message} : ${type}`);
            if (type == undefined || type == null) {
                showPopupMessage(message, title);
                return;
            }

            if (type == 0) {
                showInfoPopup(message, title);
            }else if (type == 1) {
                showWarningPopup(message, title);
            }else if (type == 2) {
                showErrorPopup(message, title);
            }else{
                showPopupMessage(message, title);
            }
        });

        socket.on(`getsupportedpackets`, async (callback) => {
            let output = ["startcontainer", "stopcontainer", "deletecontainer", "stopanddeletecontainer", "restartcontainer", "containerstatus", "getlogs", "getcontainers", "message", "popup"];
            await callback({ code: 200, packets: output });
        });

        socket.on(`executeDockerCommand`, async (containerName, command, callback) => {
            try {
                let output = await dockerManager.executeCommand(containerName, command);
                await callback({ code: 200, output: output });
            } catch (error) {
                console.error(error);
                await callback({ code: 500, message: `Error executing command: ${error}` });
            }
        });

        socket.on(`startCommandSession`, async (containerName, command, callback) => {
            let sessionId = `${util.cookieGenerator.lettersAndNumbers(15)}${new Date().getTime()}${util.cookieGenerator.lettersAndNumbers(15)}`;
            let session = await dockerManager.startCommandSession(containerName, command);
            commandSessions[sessionId] = session;
            console.log(session);
            await callback(sessionId);
        });

        socket.on(`sendCommandSession`, async (sessionid, command, callback) => {
            let session = commandSessions[sessionid];
            if (session) {
                await session.write(command);
                let output = await session.sendCommand(command);
                await callback(output);
            } else {
                await callback({ code: 404, message: `session not found` });
            }
        });

        socket.on(`endCommandSession`, async (sessionid, callback) => {
            let session = commandSessions[sessionid];
            if (session) {
                let output = await session.endSession();
                await callback(output);
            } else {
                await callback({ code: 404, message: `session not found` });
            }
        });

        socket.on("disconnect", async (reason) => {
            console.log(`Socket disconnected: ${reason}`);
            let reconnectInterval = setInterval(() => {
            if (!socket.connected) {
                console.log("Attempting to reconnect...");
                socket.connect();
            } else {
                console.log("Reconnected successfully.");
                clearInterval(reconnectInterval);
            }
            }, 5000); // Retry every 5 seconds
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

