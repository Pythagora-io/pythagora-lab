const sqlite3 = require('sqlite3').verbose();

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

module.exports = {
    loadDatabase,
};