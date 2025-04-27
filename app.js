const config = require(`${__dirname}/server/config/config.json`);

const requiredConfigVerision = `1.0.0`;
if (config.version !== requiredConfigVerision) {
	console.error(`Config version mismatch. Expected ${requiredConfigVerision}, but got ${config.version}.`);
	console.error(`Please update your config file to the latest version.`);
}

const util = require(`./server/utils/util.js`).util;
const dockerManager = require(`./server/docker/dockerManager.js`).manager;
const systemUtils = require(`./server/utils/systemUtils.js`).systemUtils;
const portScanner = require(`./server/utils/portScanner.js`).scanner;
const myArgs = process.argv.slice(2);
const docketManagerEmulator = require(`./server/docker/dockerManagerEmulator.js`).manager;

if (myArgs.includes(`--emulator`)) {
	console.log(`:: Emulator mode enabled`);
}

const scripts = {
	socket: {
		config: config.socket,
		servers: [],
	},
	config: {
		main: config,
	},
	managers: {
		docker: myArgs.includes(`--emulator`) ? docketManagerEmulator : dockerManager,
	},
	utils: {
		system: systemUtils,
		portScanner: portScanner,
	},
	settings: {
		isEmulator: myArgs.includes(`--emulator`) || myArgs.includes(`-e`),
	},
	util: util,
	args: myArgs,
};

const interactions = {
	socketConnect: async (s) => {
		if (config?.socket?.servers.length > 0) {
			for (let i = 0; i < config.socket.servers.length; i++) {
				const socket = require(`./server/socket/socket.js`).so;
				await socket.init(s, config.socket.servers[i], true);
				await socket.connect();
				scripts.socket.servers.push(socket);
			}
		}
	}
};


(async () => {
	console.log(` `);
	console.log(`:: node version            :`, process.version);

	if (scripts.settings.isEmulator) {
		console.log(`:: dockerManager emulator  :`, dockerManager.version);
		console.log(`:: dockerEmulator version   :`, docketManagerEmulator.version);
		// Ensure dockerManager and emulator have the same version and functions
		const dockerManagerFunctions = Object.keys(dockerManager);
		const emulatorFunctions = Object.keys(docketManagerEmulator);
		
		if (dockerManager.version !== docketManagerEmulator.version) {
			console.error(`Version mismatch between dockerManager (${dockerManager.version}) and emulator (${docketManagerEmulator.version}).`);
			process.exit(1);
		}
		
		const missingInEmulator = dockerManagerFunctions.filter(fn => !emulatorFunctions.includes(fn));
		const missingInDockerManager = emulatorFunctions.filter(fn => !dockerManagerFunctions.includes(fn));
		
		if (missingInEmulator.length > 0 || missingInDockerManager.length > 0) {
			console.error(`Function mismatch detected between dockerManager and emulator.`);
			if (missingInEmulator.length > 0) {
				console.error(`Missing in emulator: ${missingInEmulator.join(', ')}`);
			}
			if (missingInDockerManager.length > 0) {
				console.error(`Missing in dockerManager: ${missingInDockerManager.join(', ')}`);
			}
			process.exit(1);
		}
		
		console.log(`dockerManager and emulator are compatible.`);
	}
		
	// establish external service connections/interactions
	await dockerManager.init(scripts);
	await systemUtils.init(scripts);
	await portScanner.init(scripts);
	await interactions.socketConnect(scripts);

	// getting database info

	// bot configuration processes

	// initializing processes

	// initialize the event and command handlers
})();
