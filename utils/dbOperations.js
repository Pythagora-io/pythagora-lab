const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;

/**
 * Initializes a connection to the SQLite database file.
 * @param {string} filePath Path to the SQLite database file.
 * @returns {Promise<sqlite3.Database>} A promise that resolves with the database connection.
 */
function loadDatabase(filePath) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE, (err) => {
            if (err) {
                console.error('Error connecting to the database:', err.message);
                reject(err);
            } else {
                console.log('Connected to the SQLite database.');
                resolve(db);
            }
        });
    });
}

/**
 * Deletes the database and its related files (.db-shm, .db-wal).
 * @param {string} databasePath Path to the SQLite database file.
 * @returns {Promise<Object>} A promise that resolves with the result of the deletion operation.
 */
async function deleteDatabase(databasePath) {
    try {
        const basePath = databasePath.replace('.db', '');
        await Promise.all([
            fs.unlink(databasePath),
            fs.unlink(`${basePath}.db-shm`).catch(() => {}),
            fs.unlink(`${basePath}.db-wal`).catch(() => {})
        ]);
        console.log('Database and related files deleted successfully.');
        return { success: true, message: 'Database and related files deleted successfully.' };
    } catch (error) {
        console.error('Error deleting database:', error);
        return { success: false, message: 'Error deleting database files.' };
    }
}

module.exports = { loadDatabase, deleteDatabase };