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
	function generateRandomKey() {
		const segments = [
			4, // xxxx
			6, // xxxxxx
			3, // xxx
			5, // xxxxx
			4  // xxxx
			];
	
			return segments.map(segment => {
			return Array(segment).fill(0).map(() => {
				return Math.floor(Math.random() * 36).toString(36);
			}).join('');
			}).join('-');
		}
	
		const keys = Array.from({ length: 20 }, generateRandomKey);
		console.log(keys);
})();
