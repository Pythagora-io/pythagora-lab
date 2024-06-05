const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
// Corrected static files path to ensure it's served correctly
app.use('/public', express.static(path.join(__dirname, 'public')));

// Routes
const indexRouter = require('./routes/index');
app.use('/', indexRouter);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
}).on('error', (err) => {
  console.error('Failed to start server:', err);
});