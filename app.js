const config = require(`${__dirname}/server/config/config.json`);

const socket = require(`./server/socket/socket.js`).so;
const localNetSocket = require(`./server/socket/socket.js`).so;
const util = require(`./server/utils/util.js`).util;
const dockerManager = require(`./server/docker/dockerManager.js`).manager;
const systemUtils = require(`./server/utils/systemUtils.js`).systemUtils;
const portScanner = require(`./server/utils/portScanner.js`).scanner;
const myArgs = process.argv.slice(2);


const scripts = {
	socket: {
		socket: socket,
		config: config.socket,
		localNetSocket: localNetSocket,
	},
	config: {
		main: config,
	},
	managers: {
		docker: dockerManager,
	},
	utils: {
		system: systemUtils,
		portScanner: portScanner,
	},
	util: util,
	args: myArgs,
};

const interactions = {
	socketConnect: async (s) => {
		await scripts.socket.socket.init(s, scripts.socket.config);
		await scripts.socket.socket.connect();
		if (config.socket.enableLocalSecondary) {
			await scripts.socket.localNetSocket.init(s, config.socket, true);
			await scripts.socket.localNetSocket.connect();
		}
	}
};


(async () => {
	console.log(` `);
	console.log(`:: node version            :`, process.version);

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
