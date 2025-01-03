const config = require(`${__dirname}/server/config/config.json`);

const socket = require(`./server/socket/socket.js`).so;
const util = require(`./server/utils/util.js`).util;
const dockerManager = require(`./server/docker/dockerManager.js`).manager;
const myArgs = process.argv.slice(2);


const scripts = {
	socket: {
		socket: socket,
		config: config.socket,
	},
	config: {
		main: config,
	},
	managers: {
		docker: dockerManager,
	},
	util: util,
};

const interactions = {
	socketConnect: async (s) => {
		scripts.socket.socket.init(s, scripts.socket.config);
		await scripts.socket.socket.connect();
	}
};


(async () => {
	console.log(` `);
	console.log(`:: node version            :`, process.version);

	// establish external service connections/interactions
	await dockerManager.init(scripts);
	await interactions.socketConnect(scripts);

	// getting database info

	// bot configuration processes

	// initializing processes

	// initialize the event and command handlers
})();
