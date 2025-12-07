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
            socket.on(`file/backup`, async (opts, callback) => {
                try {
                    if (!opts.target) {
                        return callback({ code: 400, message: 'No folder path specified' });
                    }
                    if (!fs.existsSync(opts.target) || !fs.statSync(opts.target).isDirectory()) {
                        return callback({ code: 404, message: 'Folder not found' });
                    }

                    const parentDir = path.dirname(opts.target);
                    const backupDir = opts.destination || config.setup.backupFolder;
                    const baseName = path.basename(opts.target);
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const zipName = `${baseName}-${timestamp}.zip`;
                    // Define the container-specific backup directory
                    const containerBackupDir = path.join(backupDir, opts.key);
                    // Ensure backup directory exists
                    util.ensureDirectoryExists(containerBackupDir);
                    // Define the full path for the zip file
                    const zipPath = path.join(containerBackupDir, zipName);

                    const output = fs.createWriteStream(zipPath);
                    const archive = archiver('zip', { zlib: { level: 9 } });
                    await callback({ code: 200, state: 'started' });
                    output.on('close', async () => {
                        return await callback({ code: 200, state: 'completed' });
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

                    // add the directory's contents (not the directory itself)
                    archive.directory(opts.target, false);

                    await archive.finalize();
                } catch (err) {
                    console.error(`Backup error: ${err}`);
                    return await callback({ code: 500, message: 'Backup failed', error: String(err) });
                }
            });
        }
    },

}