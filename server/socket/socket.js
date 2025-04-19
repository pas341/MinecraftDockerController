var socket, identity, config, scripts, util, self, dockerManager, systemUtils, portScanner, isLocalSecondary;
const io = require(`socket.io-client`);
const machineIdSync = require(`node-machine-id`).machineIdSync;
const fs = require(`fs`);
const { exec, execSync } = require('child_process');
const path = require('path');

const commandSessions = {};
const listeners = [];

let suspended = false;
let preventReconnect = false;

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

async function handleSocketReady(socket, identity) {
    let systemSatatus = await systemUtils.getSystemStatus();
    socket.emit(`ready`, { identity: identity, systemStatus: systemSatatus });
    let docker = await dockerManager.getDocker();
    if (docker.code === 200) {
        docker = docker.docker;
    }

    let stream = await docker.getEvents({ filters: { type: ['container'] } });
    stream.on('data', async (data) => {
        let event = JSON.parse(data.toString());
        let status = event.status;

        if (status === `exec_die` || status === `exec_create` || status === `exec_start`) {
            return;
        }

        if (!event.Actor) {
            console.log(event);
            return;
        }
        if (!event.Actor.Attributes) {
            return;
        }

        if (!event.Actor.Attributes.name) {
            return;
        }


        let containerName = event.Actor.Attributes.name;
        socket.emit(`containerUpdated`, { server: identity, event: event.Action, container: containerName });

    });
    stream.on('error', (error) => {
        console.error(`Error: ${error.message}`);
    });
    stream.on('end', () => {
        console.log(`Stream ended`);
    });
    stream.on('close', () => {
        console.log(`Stream closed`);
    });
    stream.on('connect', () => {
        console.log(`Stream connected`);
    });
    stream.on('disconnect', () => {
        console.log(`Stream disconnected`);
    });

}

exports.so = {
    init: async (s, socketConfig, ilc) => {
        self = this.so;
        scripts = s;
        config = s.config.main;
        systemUtils = s.utils.system;
        isLocalSecondary = ilc;
        if (fs.existsSync(`${process.cwd()}/data/token.txt`)) {
            identity = fs.readFileSync(`${process.cwd()}/data/token.txt`, `utf-8`);
        }
        util = s.util;
        dockerManager = s.managers.docker;
        portScanner = s.utils.portScanner;
        let address = socketConfig.server;

        if (isLocalSecondary) {
            let scan = await portScanner.scanNetworkPreferedPrefixed(socketConfig.port, `192.168.1`);
            if (scan.length > 0) {
                address = `wss://${scan[0]}`;
            }
            console.log(`Connecting to local secondary server: ${address}:${socketConfig.port}`);
        } else {
            console.log(`Connecting to socket server: ${address}:${socketConfig.port}`);
        }




        socket = await io(`${address}:${socketConfig.port}`, { transports: ["websocket"], autoConnect: false, rejectUnauthorized: false });
        await self.registerListeners();
    },
    registerListeners: async () => {
        try {
            const eventsPath = path.join(__dirname, 'events');
            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

            for (const file of eventFiles) {
                //console.log(`Loading event file: ${file}`); // Debugging log
                const event = require(path.join(eventsPath, file)).event;
                if (event && typeof event.register === 'function') {
                    //console.log(`Initializing event: ${file}`); // Debugging log
                    await event.init(scripts, socket, isLocalSecondary);
                    await event.register(socket);
                    //console.log(`Registered event: ${file}`); // Debugging log
                    listeners.push(file.replace('.js', ''));
                } else {
                    //console.log(`No register function found in event file: ${file}`); // Debugging log
                }
            }
        } catch (error) {
            console.error(`Error loading event files: ${error}`); // Debugging log
        }

        socket.on("disconnect", (reason) => {
            disconnected = 1;
            console.log(`socket disconnected:\n${reason}`);
            //console.log(` [${identity}] ${util.prettyDate()} : [Warning] : socket disconnect: ${reason}`);
        });
        socket.on("error", (error) => {
            console.log(` [${identity}] ${util.prettyDate()} : [ERROR] : [SOCKET ERROR]: ${error}`);
            //console.error(error);
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
            } else if (type == 1) {
                showWarningPopup(message, title);
            } else if (type == 2) {
                showErrorPopup(message, title);
            } else {
                showPopupMessage(message, title);
            }
        });

        socket.on(`getsupportedpackets`, async (callback) => {
            await callback({ code: 200, packets: listeners });
        });

        socket.on(`suspended`, async (callback) => {
            suspended = true;
            let containers = await dockerManager.getContainers();
            for (let container of containers) {
                await container.stop().then(con => con.remove()).catch(e => { console.error(`Error stopping and removing container: ${e}`); });
            }
            await callback({ code: 200, message: `Server suspended` });
            preventPM2Restart();
            process.exit(-1);
        });

        socket.on("disconnect", async (reason) => {
            console.log(`Socket disconnected: ${reason}`);
            if (suspended) {
                console.log(`Server is suspended, not attempting to reconnect.`);
                return;
            }

            if (self.isPreventReconnect()) {
                console.log(`Preventing reconnection as per configuration.`);
                return;
            }

            let reconnectInterval = setInterval(() => {
                if (!socket.connected) {
                    console.log("Attempting to reconnect...");
                    socket.connect();
                } else {
                    console.log("Reconnected successfully.");
                    disconnected = 0;
                    clearInterval(reconnectInterval);
                }
            }, 5000); // Retry every 5 seconds
        });




    },
    connect: async () => {
        socket.open();
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
                // used to tell the server is ready to send data to web interface
                await handleSocketReady(socket, identity);
            } else if (response.code == 4253) {
                // used to tell the server has an invalid license key
                showPopupAndWait("Invalid License", "License Error");
                self.setPreventReconnect(true);
                console.log(response.message);
                console.log(`-------------------------------------------`);
                preventPM2Restart();
            } else if (response.code == 8542) {
                // used to tell the server is suspended from the main management interface
                suspended = true;
                self.setPreventReconnect(true);
                showPopupAndWait("Server Suspended from main managment interface", "Server Error");
                console.log(response.message);
                console.log(`-------------------------------------------`);
                preventPM2Restart();
            } else if (response.code == 4250) {
                // used to tell the server is not registered yet
                showPopupAndWait(`Invalid Server Token`, "Server Error");
                self.setPreventReconnect(true);
                console.log(`Server Token missing for server please contact the tool developer`);
                preventPM2Restart();
            } else if (response.code == 4258) {
                // used to tell the license key is disabled by the provider
                self.setPreventReconnect(true);
                showPopupAndWait("License Disabled by the provider", "License Error");
                console.log(`-------------------------------------------`);
                preventPM2Restart();
            } else if (response.code == 4252) {
                // used to tell the server is registered on another server
                self.setPreventReconnect(true);
                showPopupAndWait("The server token used on this server is incorrect for the hardwere on the server", "License Error");
                console.log(`-------------------------------------------`);
                preventPM2Restart();
                reject();
            } else {
                console.log(response);
            }
            console.log(`-------------------------------------------`);
            console.log(`\n \n`);
        });
        socket.once(`registerfinished`, async (response) => {
            try {
                console.log(response);
                const machineid = machineIdSync(true);
                if (response.code == 200) { // valid first register
                    if (response.token) {
                        if (!fs.existsSync(`${process.cwd()}/data`)) {
                            fs.mkdirSync(`${process.cwd()}/data`);
                        }
                        fs.writeFileSync(`${process.cwd()}/data/token.txt`, response.token);
                        console.log(`Token saved to ${process.cwd()}/data/token.txt`);
                        identity = response.token;
                    }
                } else if (response.code == 201) { // valid allready registered
                    if (fs.existsSync(`${process.cwd()}/data/token.txt`)) {
                        let token = fs.readFileSync(`${process.cwd()}/data/token.txt`, `utf-8`);
                        socket.emit(`identify`, { identity: token, machineid: machineid }); // required for socket server to know who the server is...
                        identity = token;
                    } else {
                        console.log(`Server Token missing for server please contact the tool developer`);
                        self.setPreventReconnect(true);
                        socket.disconnect(true);
                        await util.sleep(60 * 1000 * 5);
                        process.exit(-1);
                    }
                }
            } catch (error) {
                console.log(`Error: ${error}`);
            }
        });
        socket.once("connect_error", (error) => {
            console.log(` [${identity}] : [ERROR] : [SOCKET ERROR]: ${error}`);
            console.error(error);
        });
    },
    disconnect: async () => {
        socket.disconnect();
    },
    getSocket: () => {
        return socket;
    },
    setPreventReconnect: (value) => {
        preventReconnect = value;
    },
    isPreventReconnect: () => {
        return preventReconnect;
    },
};

