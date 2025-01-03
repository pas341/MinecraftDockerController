var util, self, docker, config;
const { Docker } = require('node-docker-api');

exports.manager = {
    init: async (scripts) => {
        util = scripts.util;
        config = scripts.config;
        self = this.manager;

        docker = new Docker();
    },
    getList: async () => {
        let containers = await docker.container.list();
        return containers;
    },
    getContainer: async (containername) => {
        try {
            let containers = await docker.container.list({ all: true });
            for (let c of containers) {
                if (c.data.Labels[`com.docker.compose.service`] == containername) {
                    return { code: 200, message: `container found`, container: c };
                }

                for (let name of c.data.Names) {
                    if (name.includes(containername)) {
                        return { code: 200, message: `container found`, container: c };
                    }
                }
            }
            return { code: 1, message: `container not found`, container: null };
        } catch (e) {
            console.error(`[dockerManager.js] : [getContainer()] Docker is not avalible on the server`);
            return { code: 2, message: `docker is not avalible on this server at the moment`, container: null };
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
                let action = await con.stop().then(con => con.delete()).then(() => {
                    return { code: 200, message: `container deleted` };
                }).catch(e => { return { code: 91, message: `Container failed to be stopped then deleted;`, error: e }; });
                return action;
            } else {
                return { code: 93, message: `Container not found for deleteContainer(${containername})`, failedCall: con };
            }
        } else {
            return { code: 92, message: `Failed to run container list durring deleteContainer(${containername})` };
        }
    },
    getContainerStatus: async (containername) => {
        let con = await self.getContainer(containername);
        if (con) {
            if (con.code == 200) {
                let container = con.container;
                if (container) {
                    let status = await container.status();
                    if (status) {
                        return {code: 200, status: status};
                    }else{
                        return {code: 94, message: `Unable to fetch container status`};
                    }
                }else{
                    return { code: 93, message: `Container not found for getContainerStatus: ${containername}`, failedCall: con };
                }
            }
        } else {
            return { code: 92, message: `Failed to run container list durring getContainerStatus(${containername})` };
        }
    },
    createContainer: async (containerConfig) => {
        if (!docker) {
            return {code: 502, message: `docker is not avalible on this server at the moment`, container: null};
        }

        console.log(containerConfig.name);
        console.log(self.doesContainerExist(containerConfig.name));
        if (self.doesContainerExist(containerConfig.name)) {
            return {code: 409, message: `container already exists`, container: null};
        }

        let container = await docker.container.create(containerConfig).then(con => con.start())
            .then(con => { return { code: 200, message: `Container created and started`, container: con }; })
            .catch(e => { return { code: 1, message: `Container failed to be started or created`, error: e }; });
        return container;
    }
}
