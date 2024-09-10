const { loadDatabase } = require('./dbOperations');

/**
 * Queries the 'projects' table to retrieve a list of all projects using the database file path.
 * @param {string} dbPath Path to the SQLite database file.
 * @returns {Promise<Array>} A promise that resolves with the list of projects.
 */
function getProjects(dbPath) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            const query = 'SELECT * FROM projects ORDER BY created_at DESC';
            db.all(query, [], (err, rows) => {
                if (err) {
                    console.error('Error fetching projects:', err.message);
                    reject(err);
                } else {
                    console.log(`Fetched ${rows.length} projects successfully.`);
                    resolve(rows);
                }
                db.close();
            });
        }).catch(error => {
            console.error('Failed to load database for fetching projects:', error.message);
            reject(error);
        });
    });
}

/**
 * Queries the 'branches' table to find all branches for a given project ID.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectId The ID of the project for which branches are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the list of branches for the given project ID.
 */
function getBranchesByProjectId(dbPath, projectId) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            const query = 'SELECT * FROM branches WHERE project_id = ? ORDER BY created_at DESC';
            db.all(query, [projectId], (err, rows) => {
                if (err) {
                    console.error('Error fetching branches:', err.message);
                    reject(err);
                } else {
                    console.log(`Fetched ${rows.length} branches successfully for project ID ${projectId}.`);
                    resolve(rows);
                }
                db.close();
            });
        }).catch(error => {
            console.error('Failed to load database for fetching branches:', error.message);
            reject(error);
        });
    });
}

module.exports = {
    getProjects,
    getBranchesByProjectId,
};