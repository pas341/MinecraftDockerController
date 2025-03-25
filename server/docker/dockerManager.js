var util, self, docker, config;
const Docker = require('dockerode');
const containerExec = require('dockerode-utils').containerExec;

exports.manager = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
        self = this.manager;

        docker = new Docker({ socketPath: process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock' });
    },
    getList: async () => {
        let containers = await docker.listContainers();
        return containers;
    },
    getContainer: async (containername) => {
        try {
            let containers = await docker.listContainers({ all: true });
            for (let c of containers) {
                if (c.Labels[`com.docker.compose.service`] == containername) {
                    return { code: 200, message: `container found`, container: docker.getContainer(c.Id) };
                }

                for (let name of c.Names) {
                    if (name.includes(containername)) {
                        return { code: 200, message: `container found`, container: docker.getContainer(c.Id) };
                    }
                }
            }
            return { code: 1, message: `container not found`, container: null };
        } catch (e) {
            console.error(`[dockerManager.js] : [getContainer()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    doesContainerExist: async (containername) => {
        let containerRequest = await self.getContainer(containername);
        return containerRequest.container != null;
    },
    deleteContainer: async (containername) => {
        let con = await self.getContainer(containername);
        if (con) {
            if (con.code == 200) {
                let action = await con.container.stop().then(() => con.container.remove()).then(() => {
                    return { code: 200, message: `container deleted` };
                }).catch(e => { return { code: 91, message: `Container failed to be stopped then deleted;`, error: e }; });
                return action;
            } else {
                return { code: 93, message: `Container not found for deleteContainer(${containername})`, failedCall: con };
            }
        } else {
            return { code: 92, message: `Failed to run container list during delete Container(${containername})` };
        }
    },
    getContainerStatus: async (containername) => {
        let con = await self.getContainer(containername);
        if (con) {
            if (con.code == 200) {
                let container = con.container;
                if (container) {
                    let status = await container.inspect();
                    if (status) {
                        return { code: 200, status: status };
                    } else {
                        return { code: 94, message: `Unable to fetch container status` };
                    }
                } else {
                    return { code: 93, message: `Container not found for getContainerStatus: ${containername}`, failedCall: con };
                }
            }
        } else {
            return { code: 92, message: `Failed to run container list during getContainerStatus(${containername})` };
        }
    },
    createContainer: async (containerConfig) => {
        if (!docker) {
            return { code: 502, message: `docker is not available on this server at the moment`, container: null };
        }

        if (await self.doesContainerExist(containerConfig.name)) {
            return { code: 409, message: `container already exists`, container: null };
        }

        let container = await docker.createContainer(containerConfig).then(con => con.start())
            .then(con => { return { code: 200, message: `Container created and started`, container: con }; })
            .catch(e => { return { code: 1, message: `Container failed to be started or created`, error: e }; });
        return container;
    },
    getLogs: async (containername) => {
        if (!docker) {
            return { code: 502, message: `docker is not available on this server at the moment`, container: null };
        }

        if (!await self.doesContainerExist(containername)) {
            return { code: 404, message: `container does not exist`, container: null };
        }

        let con = await self.getContainer(containername);
        let logs = await con.container.logs({ stdout: true, stderr: true, follow: false });

        // Split logs into lines and return only the last 250 lines
        let logLines = logs.toString().split('\n');
        let last250Lines = logLines.slice(-250).join('\n');

        return { code: 200, message: `Logs are in the logs object`, logs: last250Lines.split('\n').reverse().join('\n') };
        },
        getLogsPaginated: async (containername, page, perPage) => {
        if (!docker) {
            return { code: 502, message: `docker is not available on this server at the moment`, container: null };
        }

        if (!await self.doesContainerExist(containername)) {
            return { code: 404, message: `container does not exist`, container: null };
        }

        let con = await self.getContainer(containername);
        let logs = await con.container.logs({ stdout: true, stderr: true, follow: false });

        // Split logs into lines and reverse them so latest logs are first
        let logLines = logs.toString().split('\n').reverse();

        // Calculate pagination
        let totalLines = logLines.length;
        let totalPages = Math.ceil(totalLines / perPage);
        let start = (page - 1) * perPage;
        let end = start + perPage;

        // Get the requested page of logs
        let paginatedLogs = logLines.slice(start, end).join('\n');

        return {
            code: 200,
            message: `Logs are in the logs object`,
            logs: paginatedLogs,
            pagination: {
            currentPage: page,
            perPage: perPage,
            totalPages: totalPages,
            totalLines: totalLines
            }
        };
        },
        clearLogs: async (containername) => {
        if (!docker) {
            return { code: 502, message: `docker is not available on this server at the moment`, container: null };
        }

        if (!await self.doesContainerExist(containername)) {
            return { code: 404, message: `container does not exist`, container: null };
        }

        let con = await self.getContainer(containername);
        let logs = await con.container.logs({ stdout: true, stderr: true, follow: false });

        return { code: 200, message: `Logs are in the logs object`, logs: logs.toString() };
    },
    getContainers: async () => {
        let containers = await docker.listContainers({ all: true });
        return containers;
    },
    executeCommand: async (containername, command) => {
        if (!docker) {
            return { code: 502, message: `docker is not available on this server at the moment`, container: null };
        }

        if (!await self.doesContainerExist(containername)) {
            return { code: 404, message: `container does not exist`, container: null };
        }

        let con = await self.getContainer(containername);
        let status = await self.getContainerStatus(containername);

        if (status.code !== 200 || !status.status.State.Running) {
            return { code: 400, message: `container is not running`, container: null };
        }

        const output = await containerExec(con.container, command.split(` `));
        return { code: 200, message: `Command executed`, result: output.toString() };
    },
    startCommandSession: async (containername) => {
        if (!docker) {
            return { code: 502, message: `docker is not available on this server at the moment`, container: null };
        }

        if (!await self.doesContainerExist(containername)) {
            return { code: 404, message: `container does not exist`, container: null };
        }

        let con = await self.getContainer(containername);
        let exec = await con.container.exec({ Cmd: [`-i rcon-cli`], AttachStdout: true, AttachStderr: true });
        return { code: 200, message: `Command session started`, session: exec };
    },
}
