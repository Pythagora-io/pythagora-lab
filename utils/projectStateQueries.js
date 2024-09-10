const { loadDatabase } = require('./dbOperations');

async function searchProjectStates(dbPath, criteria) {
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

async function getProjectStatesByBranchId(dbPath, branchId) {
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
    searchProjectStates,
    getProjectStatesByBranchId,
};