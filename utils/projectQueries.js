const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

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
                conditions.push(`EXISTS (
                    SELECT 1 FROM json_each(ps.tasks)
                    WHERE json_each.value LIKE '%status%' AND json_each.value NOT LIKE '%done%'
                    AND json_each.value LIKE ?)`
                );
                queryParams.push(`%"description":"%${criteria.task}%"%`);
            }

            if (criteria.epic) {
                conditions.push(`EXISTS (
                    SELECT 1 FROM json_each(ps.epics)
                    WHERE json_each.value LIKE '%completed%' AND json_each.value NOT LIKE 'true'
                    AND json_each.value LIKE ?)`
                );
                queryParams.push(`%"description":"%${criteria.epic}%"%`);
            }

            if (criteria.iteration) {
                conditions.push(`EXISTS (
                    SELECT 1 FROM json_each(ps.iterations)
                    WHERE json_each.value LIKE '%completed%' AND json_each.value NOT LIKE 'true'
                    AND json_each.value LIKE ?)`
                );
                queryParams.push(`%"description":"%${criteria.iteration}%"%`);
            }

            if (criteria.llm_request) {
                conditions.push(`EXISTS (
                    SELECT 1 FROM llm_requests lr
                    WHERE lr.project_state_id = ps.id
                    AND lr.messages LIKE ?
                )`);
                queryParams.push(`%${criteria.llm_request}%`);
            }

            if (criteria.agent) {
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

/**
 * Fetches file contents for a given project state ID.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {number} projectStateId The ID of the project state.
 * @returns {Promise<Array>} A promise that resolves with an array of objects containing file paths and contents.
 */
function getFileContentsByProjectStateId(dbPath, projectStateId) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            const queryFiles = 'SELECT * FROM files WHERE project_state_id = ?';
            db.all(queryFiles, [projectStateId], (err, files) => {
                if (err) {
                    console.error('Error fetching files:', err.message);
                    reject(err);
                } else {
                    const fileContentsPromises = files.map(file => getFileContentById(db, file.content_id, file.path));
                    Promise.all(fileContentsPromises)
                        .then(contents => {
                            resolve(contents);
                            db.close();
                        })
                        .catch(error => {
                            console.error('Error resolving file contents:', error.message);
                            reject(error);
                            db.close();
                        });
                }
            });
        }).catch(error => {
            console.error('Failed to load database for fetching file contents:', error.message);
            reject(error);
        });
    });
}

/**
 * Fetches file content by content ID.
 * @param {sqlite3.Database} db The database connection.
 * @param {number} contentId The ID of the content.
 * @param {string} path The file path.
 * @returns {Promise<Object>} A promise that resolves with an object containing file path and content.
 */
function getFileContentById(db, contentId, path) {
    return new Promise((resolve, reject) => {
        db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='file_contents'", (err, row) => {
            if (err) {
                console.error('Error checking for file_contents table:', err.message);
                reject(err);
            } else if (!row) {
                console.warn('file_contents table does not exist. Returning null content.');
                resolve({ path, content: null });
            } else {
                const queryContent = 'SELECT content FROM file_contents WHERE id = ?';
                db.get(queryContent, [contentId], (errContent, contentRow) => {
                    if (errContent) {
                        console.error('Error fetching file content:', errContent.message);
                        reject(errContent);
                    } else {
                        resolve({ path, content: contentRow ? contentRow.content : null });
                    }
                });
            }
        });
    });
}

/**
 * Finds the last project state of the previous task for a given branch.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {number} branchId The ID of the branch.
 * @param {number} currentProjectStateId The ID of the current project state.
 * @returns {Promise<number>} A promise that resolves with the project state ID of the last state from the previous task.
 */
function getPreviousTaskProjectState(dbPath, branchId, currentProjectStateId) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            const query = 'SELECT id, tasks FROM project_states WHERE branch_id = ? ORDER BY created_at DESC';
            db.all(query, [branchId], (err, states) => {
                if (err) {
                    console.error('Error fetching project states:', err.message);
                    reject(err);
                } else {
                    const currentIndex = states.findIndex(state => state.id === currentProjectStateId);
                    if (currentIndex === -1 || currentIndex === 0) {
                        reject(new Error('Current project state is the first state or not found.'));
                    } else {
                        for (let i = currentIndex - 1; i >= 0; i--) {
                            if (states[i].tasks !== states[currentIndex].tasks) {
                                resolve(states[i].id);
                                db.close();
                                return;
                            }
                        }
                        reject(new Error('Previous task project state not found.'));
                    }
                }
            });
        }).catch(error => {
            console.error('Failed to load database for fetching previous task project state:', error.message);
            reject(error);
        });
    });
}

/**
 * Fetches file contents for given project state IDs.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {Array<number>} projectStateIds The IDs of the project states.
 * @returns {Promise<Object>} A promise that resolves with an object containing project state IDs as keys and arrays of file objects (containing path and content) as values.
 */
function getFileContentsForProjectStates(dbPath, projectStateIds) {
    return new Promise((resolve, reject) => {
        loadDatabase(dbPath).then(db => {
            let promises = projectStateIds.map(id => getFileContentsByProjectStateId(dbPath, id));
            Promise.all(promises)
                .then(results => {
                    let filesByStateId = {};
                    projectStateIds.forEach((id, index) => {
                        filesByStateId[id] = results[index];
                    });
                    resolve(filesByStateId);
                })
                .catch(error => {
                    console.error('Error fetching file contents for project states:', error.message);
                    reject(error);
                });
        }).catch(error => {
            console.error('Failed to load database for fetching file contents for project states:', error.message);
            reject(error);
        });
    });
}

/**
 * Fetches file contents for given project state IDs and generates a diff.
 * @param {string} dbPath Path to the SQLite database file.
 * @param {number} projectStateId1 The ID of the first project state.
 * @param {number} projectStateId2 The ID of the second project state.
 * @param {string} filePath The path of the file to diff.
 * @returns {Promise<string>} A promise that resolves with the diff of the file contents.
 */
async function getFileDiff(dbPath, projectStateId1, projectStateId2, filePath) {
    try {
        console.log('getFileDiff called with:', { dbPath, projectStateId1, projectStateId2, filePath });

        const db = await loadDatabase(dbPath);

        // Convert db.get to return a promise
        const getFileContent = promisify(db.get).bind(db);
        const getContentById = promisify(db.get).bind(db);

        const queryFile = 'SELECT content_id FROM files WHERE project_state_id = ? AND path = ?';
        const queryContent = 'SELECT content FROM file_contents WHERE id = ?';

        console.log('Fetching content_ids');
        const [contentId1, contentId2] = await Promise.all([
            getFileContent(queryFile, [projectStateId1, filePath]),
            getFileContent(queryFile, [projectStateId2, filePath])
        ]);

        console.log('Content IDs:', { contentId1, contentId2 });

        console.log('Fetching file contents');
        const content1Promise = contentId1 && contentId1.content_id ? getContentById(queryContent, contentId1.content_id) : Promise.resolve({ content: '' });
        const content2Promise = contentId2 && contentId2.content_id ? getContentById(queryContent, contentId2.content_id) : Promise.resolve({ content: '' });

        const [content1, content2] = await Promise.all([content1Promise, content2Promise]);

        console.log('File contents fetched');

        const { createPatch } = require('diff');
        console.log('Generating diff');
        const diffResult = createPatch(filePath, content1.content, content2.content);

        db.close();
        return diffResult;
    } catch (error) {
        console.error('Error in getFileDiff:', error);
        console.log('Error stack:', error.stack);
        throw error;
    }
}

module.exports = {
    loadDatabase,
    getProjects,
    getBranchesByProjectId,
    getProjectStatesByBranchId,
    searchProjectStates,
    getFileContentsByProjectStateId,
    getPreviousTaskProjectState,
    getFileContentById,
    getFileContentsForProjectStates,
    getFileDiff,
};