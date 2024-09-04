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
 * Searches project states based on given criteria and returns detailed information including LLM request counts and aggregated prompts.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {Object} criteria Criteria for filtering project states.
 * @returns {Promise<Array>} A promise that resolves with the filtered list of project states including detailed info.
 */
function searchProjectStates(dbPath, criteria) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            let divider = '-----';
            let baseQuery = `
                SELECT ps.*,
                    (SELECT COUNT(*) FROM llm_requests WHERE project_state_id = ps.id) AS llm_request_count,
                    (SELECT COUNT(*) FROM user_inputs WHERE project_state_id = ps.id) AS user_inputs_count,
                    (SELECT COUNT(*) FROM files WHERE project_state_id = ps.id) AS files_count,
                    (SELECT GROUP_CONCAT(prompts, '${divider}') FROM llm_requests WHERE project_state_id = ps.id) AS aggregated_prompts,
                    (SELECT GROUP_CONCAT(agent, '${divider}') FROM llm_requests WHERE project_state_id = ps.id) AS agents
                FROM project_states ps
                JOIN branches b ON ps.branch_id = b.id
                JOIN projects p ON b.project_id = p.id
                WHERE 1=1
            `;
            let queryParams = [];
            let conditions = [];

            if (criteria.task) {
                // Add condition to filter tasks that are not done and contain the specified criteria in their description
                conditions.push(`EXISTS (
                    SELECT 1 FROM json_each(ps.tasks)
                    WHERE json_each.value LIKE '%status%' AND json_each.value NOT LIKE '%done%'
                    AND json_each.value LIKE ?)`
                );
                queryParams.push(`%"description":"%${criteria.task}%"%`);
            }

            if (criteria.epic) {
                // Add condition to filter epic that are not done and contain the specified criteria in their description
                conditions.push(`EXISTS (
                    SELECT 1 FROM json_each(ps.epics)
                    WHERE json_each.value LIKE '%completed%' AND json_each.value NOT LIKE 'true'
                    AND json_each.value LIKE ?)`
                );
                queryParams.push(`%"description":"%${criteria.epic}%"%`);
            }

            if (criteria.iteration) {
                // Add condition to filter iteration that are not done and contain the specified criteria in their description
                conditions.push(`EXISTS (
                    SELECT 1 FROM json_each(ps.iterations)
                    WHERE json_each.value LIKE '%completed%' AND json_each.value NOT LIKE 'true'
                    AND json_each.value LIKE ?)`
                );
                queryParams.push(`%"description":"%${criteria.iteration}%"%`);
            }

            if (criteria.llm_request) {
                // Filter based on request that matches the specified criteria in the 'messages' field of the llm_requests table
                conditions.push(`EXISTS (
                    SELECT 1 FROM llm_requests lr
                    WHERE lr.project_state_id = ps.id
                    AND lr.messages LIKE ?
                )`);
                queryParams.push(`%${criteria.llm_request}%`);
            }

            if (criteria.agent) {
                // Filter based on agent that matches the specified criteria in the 'agents' field of the llm_requests table
                conditions.push(`EXISTS (
                    SELECT 1 FROM llm_requests lr
                    WHERE lr.project_state_id = ps.id
                    AND lr.agent LIKE ?
                )`);
                queryParams.push(`%${criteria.agent}%`);
            }

            if (conditions.length) {
                baseQuery += " AND " + conditions.join(" AND ");
            }

            console.log(baseQuery)
            db.all(baseQuery, queryParams, (err, rows) => {
                if (err) {
                    console.error('Error searching project states:', err.message);
                    reject(err);
                } else {
                    let updatedRows = rows.map(row => {
                        let new_prompts = [];
                        (row.aggregated_prompts || '').split(divider).forEach(element => {
                            if (element) {
                                JSON.parse(element).forEach(e => {
                                    new_prompts.push(JSON.stringify(e));
                                });
                            }
                        });
                        return {
                            ...row,
                            aggregated_prompts: new_prompts,
                            agents: row.agents ? row.agents.split(divider) : []
                        };
                    });

                    console.log(`Fetched ${updatedRows.length} filtered project states successfully.`);
                    resolve(updatedRows);
                }
                db.close();
            });
        }).catch(error => {
            console.error('Failed to load database for searching project states:', error.message);
            reject(error);
        });
    });
}

/**
 * Queries the 'project_states' table to find all project states for a given branch ID, including the count of LLM requests for each project state and aggregated prompts from all related LLM requests.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {string} branchId The ID of the branch for which project states are retrieved.
 * @returns {Promise<Array>} A promise that resolves with the list of project states for the given branch ID, including the count of LLM requests and aggregated prompts.
 */
function getProjectStatesByBranchId(dbPath, branchId) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            const query = `
                SELECT *,
                    (SELECT COUNT(*) FROM llm_requests WHERE project_state_id = ps.id) AS llm_request_count,
                    (SELECT COUNT(*) FROM user_inputs WHERE project_state_id = ps.id) AS user_inputs_count,
                    (SELECT COUNT(*) FROM files WHERE project_state_id = ps.id) AS files_count,
                    (SELECT GROUP_CONCAT(agent) FROM llm_requests WHERE project_state_id = ps.id GROUP BY agent) AS agents
                FROM project_states ps
                WHERE ps.branch_id = ?
            `;
            db.all(query, [branchId], (err, rows) => {
                if (err) {
                    console.error('Error fetching project states, LLM request counts, and agent names:', err.message);
                    reject(err);
                } else {
                    let detailedRowsPromises = rows.map(row => {
                        return new Promise((innerResolve, innerReject) => {
                            const promptQuery = `
                                SELECT prompts, agent
                                FROM llm_requests
                                WHERE project_state_id = ?
                            `;
                            db.all(promptQuery, [row.id], (promptErr, promptResults) => {
                                if (promptErr) {
                                    innerReject(promptErr);
                                    return;
                                }
                                // Extracting the 'template' field from each prompt's JSON
                                let templates = promptResults.map(promptRow => {
                                    let parsedPrompt = JSON.parse(promptRow.prompts);
                                    // Assuming that 'parsedPrompt' is an array of objects, and we need the 'template' from each
                                    return parsedPrompt.map(item => item.template);
                                }).flat();
                                innerResolve({
                                    ...row,
                                    agents: row.agents ? row.agents.split(',') : [],
                                    templates: templates
                                });
                            });
                        });
                    });

                    Promise.all(detailedRowsPromises)
                        .then(detailedRows => {
                            resolve(detailedRows);
                            db.close();
                        })
                        .catch(detailErr => {
                            console.error('Error while fetching prompts for project states:', detailErr);
                            reject(detailErr);
                            db.close();
                        });
                }
            });
        }).catch(error => {
            console.error('Failed to load database for fetching project states:', error.message);
            reject(error);
        });
    });
}

module.exports = {
    loadDatabase,
    getProjects,
    getBranchesByProjectId,
    getProjectStatesByBranchId,
    searchProjectStates,
};