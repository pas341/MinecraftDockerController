var self;
const { Rcon } = require("rcon-client");

exports.connector = {
    init: async (s) => {
        self = this.connector;
    },
    connect: async (serverinfo) => {
        let rconport = serverinfo.dockerConfig ? serverinfo.dockerConfig.rport : serverinfo.rconport;
        let rconpassword = serverinfo.dockerConfig ? serverinfo.dockerConfig.rconpassword : serverinfo.rconpassword;
        let address = serverinfo.domain;

        try {
            let connection = await Rcon.connect({ host: address, port: rconport, password: rconpassword });
            return connection;
        }catch (e) {
            console.error(`[minecraftServerConnector.js] : [connect()] Server connection is not avalible for this server: ${serverinfo.name}:${serverinfo.id}`);
            return null;
        }
    },
    exec: async (conn, command) => {
        return await conn.send(command);
    },
    minecraft: {
        enable_whitelist: async (conn) => {
            return await self.exec(conn, "whitelist on");
        },
        disable_whitelist: async (conn) => {
            return await self.exec(conn, "whitelist off");
        },
        whitelist_add: async (conn, username) => {
            return await self.exec(conn, `whitelist add ${username}`);
        },
        whitelist_remove: async (conn, username) => {
            return await self.exec(conn, `whitelist remove ${username}`);
        }
    }
}