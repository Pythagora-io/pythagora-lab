const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { getProjects, getBranchesByProjectId } = require('../utils/projectQueries');
const { getFileContentsForProjectStates, getFileDiff } = require('../utils/fileOperations');
const { searchProjectStates, getProjectStatesByBranchId } = require('../utils/projectStateQueries');
const { getLLMRequestDetailsByProjectStateId, getEpicDetailsByProjectStateId, getTaskDetailsByProjectStateId, getStepDetailsByProjectStateId, getFileDetailsByProjectStateId, getUserInputDetailsByProjectStateId, getIterationDetailsByProjectStateId } = require('../utils/detailQueries');
const { addDatabaseDescription, updateDatabaseDescription, getDatabaseDescription, saveDatabaseInfo, loadDatabaseInfo } = require('../utils/databaseInfo');
const { deleteDatabase } = require('../utils/dbOperations');
const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Uploads directory created.');
}

// Set up storage engine
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function(req, file, cb) {
    const databaseName = req.body.databaseName.trim();
    if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
      const err = new Error('Invalid database name. Use only letters, numbers, and underscores.');
      cb(err);
      return;
    }
    const fileName = databaseName.endsWith('.db') ? databaseName : `${databaseName}.db`;
    cb(null, fileName);
  }
});

// Initialize upload variable with Multer settings
const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    // Accept .db, .sqlite, .sqlite3 files and files without an extension
    const filetypes = /\.(sqlite|sqlite3|db)$/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase()) || path.extname(file.originalname) === '';
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: File upload only supports the following filetypes - .db, .sqlite, .sqlite3 or files without an extension'));
    }
  },
  limits: { fileSize: 2000000000 }
}).fields([{ name: 'databaseFile', maxCount: 1 }, { name: 'description', maxCount: 1 }]); // Updated to accept description


router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Root route
router.get('/', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error(`Failed to read uploads directory: ${err}`);
      return res.status(500).send('Error reading uploads directory');
    }
    const databases = files
      .filter(file => /\.(sqlite|sqlite3|db)$/.test(path.extname(file).toLowerCase()) || path.extname(file) === '')
      .map(file => ({
        name: file,
        description: getDatabaseDescription(file)
      }));
    res.render('index', { databases });
  });
});

// Select database route
router.post('/select-database', (req, res) => {
  const selectedDatabase = req.body.selectedDatabase;
  if (!selectedDatabase) {
    return res.status(400).send('No database selected');
  }
  const dbPath = path.join(uploadsDir, selectedDatabase);
  global.dbPath = dbPath; // Replace global variable with secure storage mechanism
  console.log(`Database selected: ${selectedDatabase}`);
  res.redirect('/projects');
});

// Rename database route
router.post('/rename-database', (req, res) => {
  const oldName = req.body.oldName;
  const newName = path.basename(req.body.newName); // Sanitize the new name to prevent directory traversal
  console.log(`Attempting to rename database from ${oldName} to ${newName}`);
  if (!oldName || !newName) {
    return res.status(400).send('Old name and new name must be provided');
  }
  const oldPath = path.join(uploadsDir, oldName);
  const newPath = path.join(uploadsDir, newName);
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      console.error(`Failed to rename database from ${oldName} to ${newName}: ${err}`);
      return res.status(500).send(`Error renaming database: ${err.message}`);
    }
    console.log(`Database renamed from ${oldName} to ${newName}`);
    console.log(`Updating database info for renamed database`);
    const info = loadDatabaseInfo();
    if (info[oldName]) {
      info[newName] = { ...info[oldName], name: newName };
      delete info[oldName];
      saveDatabaseInfo(info);
      console.log(`Database info updated successfully.`);
    }
    res.redirect('/');
  });
});

// File upload route
router.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      console.error(`File upload error: ${err}`);
      return res.status(500).send(err.message);
    }
    if (!req.files || !req.files.databaseFile || req.files.databaseFile.length === 0) {
      console.log('No database file selected.');
      return res.status(400).send('Error: No database file selected');
    } else {
      const databaseFile = req.files.databaseFile[0];
      const databaseName = databaseFile.filename;
      const dbPath = path.join(uploadsDir, databaseName);
      const info = loadDatabaseInfo();
      if (info[databaseName]) {
        return res.status(400).send('A database with this name already exists.');
      }
      console.log(`File uploaded successfully: ${databaseName}`);
      const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (dbErr) => {
        if (dbErr) {
          console.error(`Error opening database file: ${dbErr.message}`);
          fs.unlink(dbPath, (unlinkErr) => {
            if (unlinkErr) console.error(`Error removing invalid database file: ${unlinkErr.message}`);
            else console.log(`Invalid database file removed: ${databaseName}`);
          });
          return res.status(400).send('Error: Uploaded file is not a valid SQLite database');
        } else {
          console.log(`Database file verified successfully: ${databaseName}`);
          db.close();
          const description = req.body.description;
          console.log(`Description: ${description}`);
          console.log(`Adding description for database: ${databaseName}`);
          addDatabaseDescription(databaseName, description);
          global.dbPath = dbPath;
          res.redirect('/projects');
        }
      });
    }
  });
});

// Projects route
router.get('/projects', async (req, res) => {
  const dbPath = global.dbPath;
  if (!dbPath) {
    return res.status(400).send('No database file specified.');
  }
  try {
    let projects = await getProjects(dbPath);
    let branches = [];
    let projectStates = [];
    let selectedProjectId = req.query.projectId;
    let selectedBranchId = req.query.branchId;
    let { task, epic, iteration, llm_request, agent } = req.query;

    console.log('Selected Project ID:', selectedProjectId);
    console.log('Selected Branch ID:', selectedBranchId);

    projects.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!selectedProjectId && projects.length > 0) {
      selectedProjectId = projects[0].id; // Preselect the latest project if none is selected
      branches = await getBranchesByProjectId(dbPath, selectedProjectId);
      // Sort branches by created_at DESC to preselect the latest branch
      branches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (branches.length > 0) {
        selectedBranchId = branches[0].id; // Preselect the latest branch
      }
    } else if (selectedProjectId) {
      branches = await getBranchesByProjectId(dbPath, selectedProjectId);
      branches.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (branches.length > 0) {
        selectedBranchId = branches[0].id; // Preselect the latest branch
      }

      console.log('Branches:', branches);
      console.log('Selected Branch ID after sorting:', selectedBranchId);

      if (selectedBranchId) {
        if (task || epic || iteration || agent) {
          projectStates = await searchProjectStates(dbPath, { task, epic, iteration, llm_request, agent, branchId: selectedBranchId });
        } else {
          projectStates = await getProjectStatesByBranchId(dbPath, selectedBranchId);
        }
        console.log('Project States:', projectStates.map(ps => ({ id: ps.id, step_index: ps.step_index })));
      }
    }

    console.log('Rendering projects view with:', {
      projectsCount: projects.length,
      branchesCount: branches.length,
      projectStatesCount: projectStates.length,
      selectedProjectId,
      selectedBranchId
    });

    res.render('projects', { projects, branches, projectStates, selectedProjectId, selectedBranchId, task, epic, iteration, llm_request, agent });
  } catch (error) {
    console.error(`Failed to fetch projects, branches, or project states: ${error}`);
    res.status(500).send('Error fetching data');
  }
});

// Detailed data view route for LLM requests
router.get('/details/llm-requests/:projectStateId', async (req, res) => {
  const { projectStateId } = req.params;
  const dbPath = global.dbPath;
  if (!dbPath) {
    return res.status(400).send('No database file specified.');
  }
  try {
    const details = await getLLMRequestDetailsByProjectStateId(dbPath, projectStateId);
    res.render('details/llmRequests', { details });
  } catch (error) {
    console.error(`Failed to fetch LLM request details for project state ID ${projectStateId}: ${error}`);
    res.status(500).send('Error fetching LLM request details');
  }
});

// Route for fetching detailed data for project state columns
router.get('/details/:column/:projectStateId', async (req, res) => {
  const { column, projectStateId } = req.params;
  const dbPath = global.dbPath;
  if (!dbPath) {
    return res.status(400).send('No database file specified.');
  }
  try {
    let details;
    switch(column) {
      case 'epic':
        details = await getEpicDetailsByProjectStateId(dbPath, projectStateId);
        res.render('details/epicDetails', { details });
        break;
      case 'task':
        details = await getTaskDetailsByProjectStateId(dbPath, projectStateId);
        res.render('details/taskDetails', { details });
        break;
      case 'step':
        details = await getStepDetailsByProjectStateId(dbPath, projectStateId);
        res.render('details/stepDetails', { details });
        break;
      case 'files':
        details = await getFileDetailsByProjectStateId(dbPath, projectStateId);
        res.render('details/fileDetails', { details });
        break;
      case 'userInputs':
        details = await getUserInputDetailsByProjectStateId(dbPath, projectStateId);
        res.render('details/userInputDetails', { details });
        break;
      case 'llmRequests':
        details = await getLLMRequestDetailsByProjectStateId(dbPath, projectStateId);
        res.render('details/llmRequests', { details });
        break;
      case 'iteration':
        details = await getIterationDetailsByProjectStateId(dbPath, projectStateId);
        res.render('details/iterationDetails', { details });
        break;
      default:
        res.status(400).send('Invalid detail request');
    }
  } catch (error) {
    console.error(`Failed to fetch details for column ${column} and project state ID ${projectStateId}: ${error}`);
    res.status(500).send('Error fetching column details');
  }
});

// Route for deleting a database file
router.post('/delete-database', async (req, res) => {
  const { databaseName } = req.body;
  if (!databaseName) {
    return res.status(400).send('Database name is required for deletion.');
  }
  const databasePath = path.join(__dirname, '..', 'uploads', databaseName);
  if (global.dbPath === databasePath) {
    console.log('Attempt to delete the currently loaded database. Operation not allowed.');
    return res.status(400).send('Deletion of the currently loaded database is not allowed.');
  }
  const result = await deleteDatabase(databasePath);
  if (result.success) {
    const info = loadDatabaseInfo();
    delete info[databaseName];
    saveDatabaseInfo(info);
  }
  res.json(result);
});

// New route for editing database descriptions
router.post('/edit-description', (req, res) => {
  const { databaseName, newDescription } = req.body;
  if (updateDatabaseDescription(databaseName, newDescription)) {
    console.log(`Description updated for database: ${databaseName}`);
    res.redirect('/');
  } else {
    console.error(`Failed to update description for database: ${databaseName}`);
    res.status(404).send('Database not found');
  }
});

router.post('/diff', async (req, res) => {
  const { projectStateId, previousProjectStateId, branchId } = req.body;
  if (!projectStateId || !previousProjectStateId || !branchId) {
    return res.status(400).send('Project state ID and branch ID are required.');
  }
  try {
    const fileContentsForStates = await getFileContentsForProjectStates(global.dbPath, [previousProjectStateId, projectStateId]);

    const currentFiles = fileContentsForStates[projectStateId];
    const previousFiles = fileContentsForStates[previousProjectStateId] || [];

    const changedFiles = currentFiles.filter(cf => {
      const pf = previousFiles.find(pf => pf.path === cf.path);
      return !pf || pf.content !== cf.content;
    }).map(file => file.path);
    const response = {
        changedFiles: changedFiles,
        currentFiles: currentFiles.reduce((acc, cur) => ({ ...acc, [cur.path]: cur.content || 'Content not available' }), {}),
        previousFiles: previousFiles.reduce((acc, cur) => ({ ...acc, [cur.path]: cur.content || 'Content not available' }), {})
    };

    res.json(response);
  } catch (error) {
    console.error(`Error processing diff request: ${error}`);
    console.log('Error stack:', error.stack);
    res.status(500).send('Error processing diff request');
  }
});

// New route '/diff/file' to handle diff requests for files
router.post('/diff/file', (req, res) => {
    console.log('Received /diff/file request:', req.body);
    const { projectStateId, previousProjectStateId, file } = req.body;
    const dbPath = global.dbPath;

    console.log('Fetching previous task project state');
    console.log('Generating file diff');
    getFileDiff(dbPath, previousProjectStateId, projectStateId, file)
    .then(diffData => {
        console.log('File diff generated successfully');
        res.json({ diff: diffData });
    })
    .catch(error => {
        console.error('Error generating file diff:', error);
        console.log('Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to generate file diff' });
    });
});

// Download database route
router.get('/download/:databaseName', (req, res) => {
  const { databaseName } = req.params;
  const dbPath = path.join(uploadsDir, databaseName);

  if (fs.existsSync(dbPath)) {
    res.download(dbPath, databaseName, (err) => {
      if (err) {
        console.error(`Error downloading database ${databaseName}:`, err);
        res.status(500).send('Error downloading database');
      }
    });
  } else {
    console.error(`Database file not found: ${dbPath}`);
    res.status(404).send('Database file not found');
  }
});

module.exports = router;