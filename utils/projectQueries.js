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

/**
 * Queries the 'project_states' table to find all project states for a given branch ID, including the count of LLM requests for each project state.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} branchId The ID of the branch for which project states are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the list of project states for the given branch ID, including the count of LLM requests.
 */
function getProjectStatesByBranchId(dbPath, branchId) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            const query = `
                SELECT ps.*, 
                       (SELECT COUNT(*) FROM llm_requests WHERE project_state_id = ps.id) AS llm_request_count
                FROM project_states ps
                WHERE ps.branch_id = ?
            `;
            db.all(query, [branchId], (err, rows) => {
                if (err) {
                    console.error('Error fetching project states and LLM request counts:', err.message);
                    reject(err);
                } else {
                    console.log(`Fetched ${rows.length} project states successfully for branch ID ${branchId}, including LLM request counts.`);
                    resolve(rows);
                }
                db.close();
            });
        }).catch(error => {
            console.error('Failed to load database for fetching project states and LLM request counts:', error.message);
            reject(error);
        });
    });
}

module.exports = {
    loadDatabase,
    getProjects,
    getBranchesByProjectId,
    getProjectStatesByBranchId,
};