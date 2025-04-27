// filepath: h:/Dev/NodeApps/MinecraftDockerController/server/docker/dockerManagerEmulator.js

const containers = {
    "mock_container_1": { Id: "1", Names: ["/mock_container_1"], State: "running" },
    "mock_container_2": { Id: "2", Names: ["/mock_container_2"], State: "exited" }
};

const images = {
    "mock_image:latest": { Id: "img1", RepoTags: ["mock_image:latest"] }
};

exports.manager = {
    version: "1.0.0",
    init: async (scripts) => {
        console.log("[dockerManagerEmulator.js] : [init()] Emulator initialized");
        return { code: 200, message: "Emulator initialized" };
    },
    getList: async () => {
        console.log("[dockerManagerEmulator.js] : [getList()] Returning mock container list");
        return Object.values(containers);
    },
    getImages: async () => {
        console.log("[dockerManagerEmulator.js] : [getImages()] Returning mock image list");
        return { code: 200, message: "images found", images: Object.values(images) };
    },
    readEvents: async (callback) => {
        console.log("[dockerManagerEmulator.js] : [readEvents()] Simulating event stream");
        setTimeout(() => callback({ code: 200, message: "Container started", event: { status: "start" } }), 1000);
        setTimeout(() => callback({ code: 200, message: "Container stopped", event: { status: "stop" } }), 2000);
    },
    getDocker: async () => {
        console.log("[dockerManagerEmulator.js] : [getDocker()] Returning mock Docker instance");
        return { code: 200, message: "docker is available", docker: {} };
    },
    getContainer: async (containername) => {
        console.log(`[dockerManagerEmulator.js] : [getContainer()] Searching for container: ${containername}`);
        if (containers[containername]) {
            return { code: 200, message: "container found", container: containers[containername] };
        }
        return { code: 1, message: "container not found", container: null };
    },
    getRunningContainers: async () => {
        console.log("[dockerManagerEmulator.js] : [getRunningContainers()] Returning mock running containers");
        const runningContainers = Object.values(containers).filter(container => container.State === "running");
        return { code: 200, message: "containers found", containers: runningContainers };
    },
    doesContainerExist: async (containername) => {
        console.log(`[dockerManagerEmulator.js] : [doesContainerExist()] Checking existence for: ${containername}`);
        return !!containers[containername];
    },
    deleteContainer: async (containername) => {
        console.log(`[dockerManagerEmulator.js] : [deleteContainer()] Deleting container: ${containername}`);
        if (containers[containername]) {
            delete containers[containername];
            return { code: 200, message: "container deleted" };
        }
        return { code: 1, message: "container not found" };
    },
    getContainerStatus: async (containername) => {
        console.log(`[dockerManagerEmulator.js] : [getContainerStatus()] Getting status for: ${containername}`);
        if (containers[containername]) {
            return { code: 200, status: { State: { Running: containers[containername].State === "running" } } };
        }
        return { code: 1, message: "container not found" };
    },
    createContainer: async (containerConfig) => {
        console.log(`[dockerManagerEmulator.js] : [createContainer()] Creating container with config:`, containerConfig);
        if (containers[containerConfig.name]) {
            return { code: 409, message: "container already exists" };
        }
        const newContainer = { Id: String(Object.keys(containers).length + 1), Names: [`/${containerConfig.name}`], State: "running" };
        containers[containerConfig.name] = newContainer;
        return { code: 200, message: "Container created and started", container: newContainer };
    },
    getLogs: async (containername) => {
        console.log(`[dockerManagerEmulator.js] : [getLogs()] Fetching logs for: ${containername}`);
        if (containers[containername]) {
            return { code: 200, message: "Logs are in the logs object", logs: "Mock log line 1\nMock log line 2\nMock log line 3" };
        }
        return { code: 404, message: "container does not exist" };
        },
        getLogsPaginated: async (containername, page, perPage) => {
        console.log(`[dockerManagerEmulator.js] : [getLogsPaginated()] Fetching paginated logs for: ${containername}`);
        if (containers[containername]) {
            const logs = [];
            for (let i = 1; i <= 1000; i++) {
                logs.push(`Mock log line ${i}`);
            }
            const totalLines = logs.length;
            const totalPages = Math.ceil(totalLines / perPage);
            const start = (page - 1) * perPage;
            const end = start + perPage;
            const paginatedLogs = logs.slice(start, end).join("\n");
            return {
            code: 200,
            message: "Logs are in the logs object",
            logs: paginatedLogs,
            pagination: { currentPage: page, perPage: perPage, totalPages: totalPages, totalLines: totalLines }
            };
        }
        return { code: 404, message: "container does not exist" };
        },
        clearLogs: async (containername) => {
        console.log(`[dockerManagerEmulator.js] : [clearLogs()] Clearing logs for: ${containername}`);
        if (containers[containername]) {
            return { code: 200, message: "Logs cleared" };
        }
        return { code: 404, message: "container does not exist" };
    },
    getContainers: async () => {
        console.log("[dockerManagerEmulator.js] : [getContainers()] Returning mock container list");
        return Object.values(containers);
    },
    executeCommand: async (containername, command) => {
        console.log(`[dockerManagerEmulator.js] : [executeCommand()] Executing command on: ${containername}`);
        if (containers[containername]) {
            return { code: 200, message: "Command executed", result: `Executed command: ${command}` };
        }
        return { code: 404, message: "container does not exist" };
    },
    stopContainer: async (containername, callback) => {
        console.log(`[dockerManagerEmulator.js] : [stopContainer()] Stopping container: ${containername}`);
        if (containers[containername]) {
            containers[containername].State = "exited";
            await callback({ code: 200, message: "container stopped" });
        } else {
            await callback({ code: 404, message: "container not found" });
        }
    },
    startContainer: async (containername, callback) => {
        console.log(`[dockerManagerEmulator.js] : [startContainer()] Starting container: ${containername}`);
        if (containers[containername]) {
            containers[containername].State = "running";
            await callback({ code: 200, message: "container started" });
        } else {
            await callback({ code: 404, message: "container not found" });
        }
    },
    restartContainer: async (containername, callback) => {
        console.log(`[dockerManagerEmulator.js] : [restartContainer()] Restarting container: ${containername}`);
        if (containers[containername]) {
            containers[containername].State = "exited";
            setTimeout(() => {
                containers[containername].State = "running";
                callback({ code: 200, message: "container restarted" });
            }, 1000);
        } else {
            await callback({ code: 404, message: "container not found" });
        }
    },
    stopAndRemoveContainer: async (containername, callback) => {
        console.log(`[dockerManagerEmulator.js] : [stopAndRemoveContainer()] Stopping and removing container: ${containername}`);
        if (containers[containername]) {
            containers[containername].State = "exited";
            setTimeout(() => {
                delete containers[containername];
                callback({ code: 200, message: "container stopped and removed" });
            }, 1000);
        } else {
            await callback({ code: 404, message: "container not found" });
        }
    },
    removeContainer: async (containername, callback) => {
        console.log(`[dockerManagerEmulator.js] : [removeContainer()] Removing container: ${containername}`);
        if (containers[containername]) {
            delete containers[containername];
            await callback({ code: 200, message: "container removed" });
        } else {
            await callback({ code: 404, message: "container not found" });
        }
    }
};