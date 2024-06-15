```
# Pythagora Lab

Pythagora Lab is an interactive web application designed to provide users with the ability to view and analyze data stored in SQLite databases. It focuses on project management data, enabling users to load databases from the disk, select projects and branches, and delve into detailed project states, including tasks, files, and LLM requests/responses.

## Overview

The application utilizes a traditional web architecture with a Node.js backend leveraging Express for routing and SQLite for database management. The frontend is built using Bootstrap for responsive design and EJS for server-side templating. This setup allows for dynamic content rendering based on user interactions, such as database selection and project analysis.

### Project Structure

- **Backend**: Node.js and Express are used to handle server-side logic, including file uploads, database parsing, and data serving.
- **Database**: SQLite databases store project data, which can be uploaded by users for analysis.
- **Frontend**: Bootstrap and EJS provide a user-friendly interface for interacting with the application. JavaScript is used to enhance interactivity, such as details toggling and search filtering.

## Features

- **Database Upload**: Users can upload SQLite database files to analyze project data.
- **Project Selection**: Dynamically generated dropdowns allow users to select projects and branches to analyze.
- **Detailed Analysis**: Users can explore detailed project states, including tasks, files, LLM requests/responses, and user inputs.
- **Interactive Search**: Search bars above each column enable users to filter project states based on specific criteria.

## Getting Started

### Requirements

- Node.js
- SQLite
- Express
- sqlite3 (Node.js package)
- multer (for handling multipart/form-data)
- ejs (for templating)
- Bootstrap (for styling)

### Quickstart

1. **Clone the repository**

   ```
   git clone https://example.com/pythagora-lab.git
   cd pythagora-lab
   ```

2. **Install dependencies**

   ```
   npm install
   ```

3. **Start the application**

   ```
   npm start
   ```

   This will start the server on `http://localhost:3000`.

4. **Access the application**

   Open your web browser and navigate to `http://localhost:3000` to start using Pythagora Lab.

### License

Copyright (c) 2024.

This software is proprietary and may not be copied, modified, or distributed without the express written consent of the copyright owner.
```