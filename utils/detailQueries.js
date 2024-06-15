const sqlite3 = require('sqlite3').verbose();

/**
 * Fetches detailed LLM request data for a given project state ID.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectStateId The ID of the project state for which LLM request details are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the LLM request details for the given project state ID.
 */
function getLLMRequestDetailsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('Error opening database for LLM request details:', err.message);
                reject(err);
            } else {
                const query = 'SELECT * FROM llm_requests WHERE project_state_id = ?';
                db.all(query, [projectStateId], (err, rows) => {
                    if (err) {
                        console.error('Error fetching LLM request details:', err.message);
                        reject(err);
                    } else {
                        console.log(`Fetched LLM request details successfully for project state ID ${projectStateId}.`);
                        resolve(rows);
                    }
                    db.close();
                });
            }
        });
    });
}

/**
 * Fetches detailed data for the 'epic' column in a project state.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectStateId The ID of the project state for which epic details are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the epic details for the given project state ID.
 */
function getEpicDetailsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('Error opening database for epic details:', err.message);
                reject(err);
            } else {
                const query = 'SELECT epics FROM project_states WHERE id = ?';
                db.get(query, [projectStateId], (err, row) => {
                    if (err) {
                        console.error('Error fetching epic details:', err.message);
                        reject(err);
                    } else {
                        if (row && row.epics) {
                            try {
                                const epics = JSON.parse(row.epics);
                                console.log(`Fetched epic details successfully for project state ID ${projectStateId}.`);
                                resolve(epics);
                            } catch (parseErr) {
                                console.error('Error parsing epic details:', parseErr.message);
                                reject(parseErr);
                            }
                        } else {
                            console.log(`No epic details found for project state ID ${projectStateId}.`);
                            resolve([]);
                        }
                    }
                    db.close();
                });
            }
        });
    });
}

/**
 * Fetches detailed data for the 'task' column in a project state.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectStateId The ID of the project state for which task details are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the task details for the given project state ID.
 */
function getTaskDetailsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('Error opening database for task details:', err.message);
                reject(err);
            } else {
                const query = 'SELECT tasks FROM project_states WHERE id = ?';
                db.get(query, [projectStateId], (err, row) => {
                    if (err) {
                        console.error('Error fetching task details:', err.message);
                        reject(err);
                    } else {
                        if (row && row.tasks) {
                            try {
                                const tasks = JSON.parse(row.tasks);
                                console.log(`Fetched task details successfully for project state ID ${projectStateId}.`);
                                resolve(tasks);
                            } catch (parseErr) {
                                console.error('Error parsing task details:', parseErr.message);
                                reject(parseErr);
                            }
                        } else {
                            console.log(`No task details found for project state ID ${projectStateId}.`);
                            resolve([]);
                        }
                    }
                    db.close();
                });
            }
        });
    });
}

/**
 * Fetches detailed data for the 'step' column in a project state.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectStateId The ID of the project state for which step details are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the step details for the given project state ID.
 */
function getStepDetailsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('Error opening database for step details:', err.message);
                reject(err);
            } else {
                const query = 'SELECT steps FROM project_states WHERE id = ?';
                db.get(query, [projectStateId], (err, row) => {
                    if (err) {
                        console.error('Error fetching step details:', err.message);
                        reject(err);
                    } else {
                        if (row && row.steps) {
                            try {
                                const steps = JSON.parse(row.steps);
                                console.log(`Fetched step details successfully for project state ID ${projectStateId}.`);
                                resolve(steps);
                            } catch (parseErr) {
                                console.error('Error parsing step details:', parseErr.message);
                                reject(parseErr);
                            }
                        } else {
                            console.log(`No step details found for project state ID ${projectStateId}.`);
                            resolve([]);
                        }
                    }
                    db.close();
                });
            }
        });
    });
}

/**
 * Fetches detailed data for the 'files' column in a project state, including file content.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectStateId The ID of the project state for which file details are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the file details for the given project state ID, including file content.
 */
function getFileDetailsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('Error opening database for file details:', err.message);
                reject(err);
            } else {
                const query = `
                SELECT f.*, fc.content
                FROM files f
                LEFT JOIN file_contents fc ON f.content_id = fc.id
                WHERE f.project_state_id = ?`;
                db.all(query, [projectStateId], (err, rows) => {
                    if (err) {
                        console.error('Error fetching file details:', err.message);
                        reject(err);
                    } else {
                        console.log(`Fetched file details successfully for project state ID ${projectStateId}, including file content.`);
                        resolve(rows);
                    }
                    db.close();
                });
            }
        });
    });
}

/**
 * Fetches detailed data for the 'user inputs' column in a project state.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectStateId The ID of the project state for which user input details are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the user input details for the given project state ID.
 */
function getUserInputDetailsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('Error opening database for user input details:', err.message);
                reject(err);
            } else {
                const query = 'SELECT * FROM user_inputs WHERE project_state_id = ?';
                db.all(query, [projectStateId], (err, rows) => {
                    if (err) {
                        console.error('Error fetching user input details:', err.message);
                        reject(err);
                    } else {
                        console.log(`Fetched user input details successfully for project state ID ${projectStateId}.`);
                        resolve(rows);
                    }
                    db.close();
                });
            }
        });
    });
}

/**
 * Fetches detailed data for the 'iterations' column in a project state.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} projectStateId The ID of the project state for which iteration details are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the iteration details for the given project state ID.
 */
function getIterationDetailsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
            if (err) {
                console.error('Error opening database for iteration details:', err.message);
                reject(err);
            } else {
                const query = 'SELECT iterations FROM project_states WHERE id = ?';
                db.get(query, [projectStateId], (err, row) => {
                    if (err) {
                        console.error('Error fetching iteration details:', err.message);
                        reject(err);
                    } else {
                        if (row && row.iterations) {
                            try {
                                const iterations = JSON.parse(row.iterations);
                                console.log(`Fetched iteration details successfully for project state ID projectState: ${projectStateId}.`);
                                resolve(iterations);
                            } catch (parseErr) {
                                console.error('Error parsing iteration details:', parseErr.message);
                                reject(parseErr);
                            }
                        } else {
                            console.log(`No iteration details found for project state ID ${projectStateId}.`);
                            resolve([]);
                        }
                    }
                    db.close();
                });
            }
        });
    });
}

module.exports = {
    getLLMRequestDetailsByProjectStateId,
    getEpicDetailsByProjectStateId,
    getTaskDetailsByProjectStateId,
    getStepDetailsByProjectStateId,
    getFileDetailsByProjectStateId,
    getUserInputDetailsByProjectStateId,
    getIterationDetailsByProjectStateId,
};