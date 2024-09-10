const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const { createPatch } = require('diff');
const { loadDatabase } = require('./dbOperations');

async function getFileContentsByProjectStateId(dbPath, projectStateId) {
    try {
        const db = await loadDatabase(dbPath);
        const queryFiles = 'SELECT * FROM files WHERE project_state_id = ?';
        const files = await promisify(db.all).bind(db)(queryFiles, projectStateId);
        const fileContentsPromises = files.map(file => getFileContentById(db, file.content_id, file.path));
        const contents = await Promise.all(fileContentsPromises);
        db.close();
        return contents;
    } catch (error) {
        console.error('Error in getFileContentsByProjectStateId:', error.message);
        console.log('Error stack:', error.stack);
        throw error;
    }
}

async function getFileContentById(db, contentId, path) {
    try {
        const queryContent = 'SELECT content FROM file_contents WHERE id = ?';
        const contentRow = await promisify(db.get).bind(db)(queryContent, contentId);
        return { path, content: contentRow ? contentRow.content : null };
    } catch (error) {
        console.error('Error in getFileContentById:', error.message);
        console.log('Error stack:', error.stack);
        throw error;
    }
}

async function getFileContentsForProjectStates(dbPath, projectStateIds) {
    try {
        const db = await loadDatabase(dbPath);
        let filesByStateId = {};
        for (let id of projectStateIds) {
            filesByStateId[id] = await getFileContentsByProjectStateId(dbPath, id);
        }
        db.close();
        return filesByStateId;
    } catch (error) {
        console.error('Error in getFileContentsForProjectStates:', error.message);
        console.log('Error stack:', error.stack);
        throw error;
    }
}

async function getFileDiff(dbPath, projectStateId1, projectStateId2, filePath) {
    try {
        const db = await loadDatabase(dbPath);
        const queryFile = 'SELECT content_id FROM files WHERE project_state_id = ? AND path = ?';
        const queryContent = 'SELECT content FROM file_contents WHERE id = ?';

        const contentId1 = await promisify(db.get).bind(db)(queryFile, [projectStateId1, filePath]);
        const contentId2 = await promisify(db.get).bind(db)(queryFile, [projectStateId2, filePath]);

        const content1 = contentId1 && contentId1.content_id ? await promisify(db.get).bind(db)(queryContent, contentId1.content_id) : { content: '' };
        const content2 = contentId2 && contentId2.content_id ? await promisify(db.get).bind(db)(queryContent, contentId2.content_id) : { content: '' };

        const diffResult = createPatch(filePath, content1.content, content2.content);

        db.close();
        return diffResult;
    } catch (error) {
        console.error('Error in getFileDiff:', error.message);
        console.log('Error stack:', error.stack);
        throw error;
    }
}

module.exports = {
    getFileContentsForProjectStates,
    getFileDiff,
};