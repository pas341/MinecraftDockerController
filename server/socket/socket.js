var socket, identity, config, scripts, util, self, dockerManager, systemUtils;
const io = require(`socket.io-client`);
const machineIdSync = require(`node-machine-id`).machineIdSync;
const fs = require(`fs`);
const { exec, execSync } = require('child_process');
const path = require('path');

const commandSessions = {};
const listeners = [];

let suspended = false;

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
        systemUtils = s.utils.system;
        if (fs.existsSync(`${process.cwd()}/data/token.txt`)) {
            identity = fs.readFileSync(`${process.cwd()}/data/token.txt`, `utf-8`);
        }
        util = s.util;
        dockerManager = s.managers.docker;

        socket = io(`${socketConfig.server}:${socketConfig.port}`, { transports: ["websocket"], autoConnect: false, rejectUnauthorized: false });
        self.registerListeners();
    },
    registerListeners: async () => {
        try {
            const eventsPath = path.join(__dirname, 'events');
            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
            
            for (const file of eventFiles) {
                console.log(`Loading event file: ${file}`);
                const event = require(path.join(eventsPath, file)).event;
                if (event && typeof event.register === 'function') {
                    event.init(scripts, socket);
                    await event.register(socket);
                    listeners.push(file.replace('.js', ''));
                }else{
                    console.log(`No register function found in event file: ${file}`);
                }
            }
        }catch (error) {
            console.error(`Error loading event files: ${error}`);
        }

        socket.on("disconnect", (reason) => {
            disconnected = 1;
            console.log(`socket disconnected:\n${reason}`);
            //console.log(` [${identity}] ${util.prettyDate()} : [Warning] : socket disconnect: ${reason}`);
        });
        socket.on("error", (error) => {
            console.log(` [${identity}] ${util.prettyDate()} : [ERROR] : [SOCKET ERROR]: ${error}`);
            console.error(error);
        });

        socket.on(`containerexists`, async (containername, callback) => {
            await callback(await dockerManager.doesContainerExist(containername));
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

        socket.on(`getsupportedpackets`, async (callback) => {;
            await callback({ code: 200, packets: listeners });
        });

        socket.on(`suspended`, async (callback) => {
            suspended = true;
            let containers = await dockerManager.getContainers();
            for (let container of containers) {
                    await container.stop().then(con => con.remove()).catch(e => { console.error(`Error stopping and removing container: ${e}`); });
            }
            await callback({ code: 200, message: `Server suspended` });
        });

        socket.on("disconnect", async (reason) => {
            console.log(`Socket disconnected: ${reason}`);
            if (suspended) {
                console.log(`Server is suspended, not attempting to reconnect.`);
                return;
            }
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
                } else if (response.code == 8542) {
                    suspended = true;
                    showPopupAndWait("Server Suspended from main managment interface", "Server Error");
                    console.log(response.message);
                    console.log(`-------------------------------------------`);
                    preventPM2Restart();
                }else if (response.code == 4250) {
                    showPopupAndWait(`Invalid Server Token`, "Server Error");
                    console.log(`Server Token missing for server please contact the tool developer`);
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

