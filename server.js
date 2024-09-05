const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to parse JSON bodies
app.use(express.json());

// Static files
// Corrected static files path to ensure it's served correctly
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

// Route handler for POST requests to "/diff/file"
app.post('/diff/file', (req, res) => {
    const { projectStateId, branchId, file } = req.body;
    const dbPath = global.dbPath;

    // Implement the logic to fetch and generate the diff for the specified file
    // This might involve calling functions from your utility modules

    // Corrected getFileDiff function call to include the dbPath parameter
    // Assuming getFileDiff is implemented in utils/projectQueries.js
    const { getFileDiff, getPreviousTaskProjectState } = require('./utils/projectQueries');

    getPreviousTaskProjectState(dbPath, branchId, projectStateId).then(previousprojectStateId => {
      console.log(previousprojectStateId)
      getFileDiff(dbPath, projectStateId, previousprojectStateId, file)
      .then(diffData => {
          res.json({ diff: diffData });
      })
      .catch(error => {
          console.error('Error generating file diff:', error);
          res.status(500).json({ error: 'Failed to generate file diff' });
      });
    })
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
});