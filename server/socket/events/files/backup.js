var socket, identity, config, scripts, util, self, dockerManager, systemUtils, socketConfig;

const fs = require('fs');
const path = require('path');
const archiver = require('archiver'); // added

exports.event = {
    init: async (s, socket, sc) => {
        scripts = s;
        self = this.event;
        util = scripts.util;
        config = scripts.config.main;
        dockerManager = scripts.managers.docker;
        systemUtils = scripts.utils.system;
        identity = scripts.identity;
        socketConfig = sc;
        socket = socket;
    },
    register: async (socket) => {
        if (config.fsenabled) {
            socket.on(`file/backup`, async (folderPath, callback) => {
                try {
                    if (!folderPath) {
                        return callback({ code: 400, message: 'No folder path specified' });
                    }
                    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
                        return callback({ code: 404, message: 'Folder not found' });
                    }

                    const parentDir = path.dirname(folderPath);
                    const baseName = path.basename(folderPath);
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const zipName = `${baseName}-${timestamp}.zip`;
                    const zipPath = path.join(parentDir, zipName);

                    const output = fs.createWriteStream(zipPath);
                    const archive = archiver('zip', { zlib: { level: 9 } });

                    output.on('close', () => {
                        return callback({ code: 200, message: 'Backup created' });
                    });

                    archive.on('warning', (err) => {
                        if (err.code === 'ENOENT') {
                            console.warn(err);
                        } else {
                            throw err;
                        }
                    });

                    archive.on('error', (err) => {
                        throw err;
                    });

                    archive.pipe(output);

                    // include the folder itself inside zip (use '.' to include only contents)
                    archive.directory(folderPath, baseName);

                    await archive.finalize();
                } catch (err) {
                    console.error(`Backup error: ${err}`);
                    return callback({ code: 500, message: 'Backup failed', error: String(err) });
                }
            });
        }
    },

}