var util, self, docker, config;
const Docker = require('dockerode');
const containerExec = require('dockerode-utils').containerExec;

exports.manager = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
        self = this.manager;

        let platform = process.platform;
        let dockerPipe = platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';

        if (config?.main?.docker?.pipeOverride?.length > 0) {
            dockerPipe = config.main.docker.pipeOverride;
        }

        try {
            docker = new Docker({ socketPath: dockerPipe });
        } catch (e) {
            try {
                if (platform === 'win32') {
                    docker = new Docker({ socketPath: '//./pipe/dockerDesktopLinuxEngine' });
                }
            } catch (e) {
                console.error(`[dockerManager.js] : [init()] Docker is not available on the server`);
                docker = null;
            }
        }
    },
    getList: async () => {
        try {
            let containers = await docker.listContainers();
            return containers;
        } catch (e) {
            console.error(`[dockerManager.js] : [getList()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, containers: [] };
        };
    },
    readEvents: async (callback) => {
        try {
            let stream = await docker.getEvents({ since: 0, until: 0, filters: { event: ['start', 'stop'] } });
            stream.on('data', (data) => {
                let event = JSON.parse(data.toString('utf8'));
                if (event.status == 'start') {
                    callback({ code: 200, message: `Container started`, event: event });
                } else if (event.status == 'stop') {
                    callback({ code: 200, message: `Container stopped`, event: event });
                } else {
                    callback({ code: 200, message: `Container event`, event: event });
                }
            });
            stream.on('error', (err) => {
                console.error(`[dockerManager.js] : [readEvents()] Error reading events: ${err}`);
                callback({ code: 1, message: `Error reading events`, error: err });
            });
            stream.on('end', () => {
                console.log(`[dockerManager.js] : [readEvents()] Stream ended`);
                callback({ code: 1, message: `Stream ended` });
            });
        } catch (e) {
            console.error(`[dockerManager.js] : [readEvents()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, containers: [] };
        }
    },
    getDocker: async () => {
        if (!docker) {
            return { code: 502, message: `docker is not available on this server at the moment`, docker: null };
        }
        return { code: 200, message: `docker is available`, docker: docker };
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
    getRunningContainers: async () => {
        try {
            let containers = await docker.listContainers();
            return {code: 200, message: `containers found`, containers: containers};
        } catch (e) {
            console.error(`[dockerManager.js] : [getRunningContainers()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, containers: [] };
        }
    },
    doesContainerExist: async (containername) => {
        try {
            let containerRequest = await self.getContainer(containername);
            return containerRequest.container != null;
        } catch (e) {
            console.error(`[dockerManager.js] : [doesContainerExist()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    deleteContainer: async (containername) => {
        try {
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
        } catch (e) {
            console.error(`[dockerManager.js] : [deleteContainer()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    getContainerStatus: async (containername) => {
        try {
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
        } catch (e) {
            console.error(`[dockerManager.js] : [getContainerStatus()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    createContainer: async (containerConfig) => {
        try {
            if (!docker) {
                return { code: 502, message: `docker is not available on this server at the moment`, container: null };
            }
            
            if (await self.doesContainerExist(containerConfig.name)) {
                return { code: 409, message: `container already exists`, container: null };
            }
            
            let container = await docker.createContainer(containerConfig).then(con => con.start())
            .then(con => { return { code: 200, message: `Container created and started`, container: con }; })
            .catch(e => {
                console.error(`[dockerManager.js] : [createContainer()] Error creating container: ${e}`);
                console.error(e);
                return { code: 1, message: `Container failed to be started or created`, error: e };
            });
            return container;
        } catch (e) {
            console.error(`[dockerManager.js] : [createContainer()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    getLogs: async (containername) => {
        try {
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
        } catch (e) {
            console.error(`[dockerManager.js] : [getLogs()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    getLogsPaginated: async (containername, page, perPage) => {
        try {
            if (!docker) {
                return { code: 502, message: `docker is not available on this server at the moment`, container: null };
            }
            
            if (!await self.doesContainerExist(containername)) {
                return { code: 404, message: `container does not exist`, container: null };
            }
            
            let con = await self.getContainer(containername);
            let params = { stdout: true, stderr: true, follow: false };
            let logs = await con.container.logs(params);
            // Split logs into lines and reverse them so latest logs are first
            let logLines = logs.toString(`utf-8`).split('\n').reverse();
            
            // Calculate pagination
            let totalLines = logLines.length;
            let totalPages = Math.ceil(totalLines / perPage);
            let start = (page - 1) * perPage;
            let end = start + perPage;
            
            // Get the requested page of logs
            let paginatedLogs = logLines.slice(start, end).join('\n');
            // Reverse the lines back to their original order
            paginatedLogs = paginatedLogs.split('\n').reverse().join('\n');
            
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
        } catch (e) {
            console.error(`[dockerManager.js] : [getLogsPaginated()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    clearLogs: async (containername) => {
        try {
            if (!docker) {
                return { code: 502, message: `docker is not available on this server at the moment`, container: null };
            }
            
            if (!await self.doesContainerExist(containername)) {
                return { code: 404, message: `container does not exist`, container: null };
            }
            
            let con = await self.getContainer(containername);
            let logs = await con.container.logs({ stdout: true, stderr: true, follow: false });
            
            return { code: 200, message: `Logs are in the logs object`, logs: logs.toString(`utf-8`) };
        } catch (e) {
            console.error(`[dockerManager.js] : [clearLogs()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    },
    getContainers: async () => {
        try {
            let containers = await docker.listContainers({ all: true });
            return containers;
        } catch (e) {
            console.error(`[dockerManager.js] : [getContainers()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, containers: [] };
        }
    },
    executeCommand: async (containername, command) => {
        try {
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
            return { code: 200, message: `Command executed`, result: output.toString(`utf-8`) };
        } catch (e) {
            console.error(`[dockerManager.js] : [executeCommand()] Docker is not available on the server`);
            return { code: 2, message: `docker is not available on this server at the moment`, container: null };
        }
    }
}
