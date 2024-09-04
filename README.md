# Pythagora Lab

Pythagora Lab is a web application designed for interactive viewing and analysis of data from SQLite databases. It allows users to upload SQLite databases, select projects, and explore detailed project states including tasks, files, LLM requests/responses, and more. The application is built using Node.js, Express, SQLite, EJS, and Bootstrap.

## Overview

Pythagora Lab features a robust architecture that integrates a Node.js backend with Express for routing, SQLite for data storage, and EJS for server-side templating. The frontend is styled with Bootstrap to ensure a responsive and user-friendly interface. The project structure is organized as follows:

- **Backend**: Node.js with Express
- **Database**: SQLite
- **Templating**: EJS
- **Styling**: Bootstrap

### Project Structure

```
├── public/
│   ├── js/
│   │   ├── deleteDatabase.js
│   │   ├── detailsToggle.js
│   │   ├── formatJson.js
│   │   └── toggleVisibility.js
│   └── styles/
│       └── styles.css
├── routes/
│   └── index.js
├── utils/
│   ├── databaseInfo.js
│   ├── db.js
│   ├── detailQueries.js
│   └── projectQueries.js
├── views/
│   ├── details/
│   │   ├── epicDetails.ejs
│   │   ├── fileDetails.ejs
│   │   ├── iterationDetails.ejs
│   │   ├── llmRequests.ejs
│   │   ├── stepDetails.ejs
│   │   ├── taskDetails.ejs
│   │   └── userInputDetails.ejs
│   ├── index.ejs
│   └── projects.ejs
├── .gitignore
├── package.json
├── server.js
└── database_info.json
```

## Features

- **Database Upload**: Users can upload SQLite databases and provide descriptions.
- **Project Selection**: Users can select projects and branches to view related data.
- **Project State Analysis**: Users can view detailed project states, including tasks, LLM requests, files, and user inputs.
- **Search Functionality**: Each column in the project state table has a search bar for filtering data.
- **Detailed Views**: Clicking on specific columns provides detailed information about that data.
- **Database Management**: Users can rename, edit descriptions, and delete databases.

## Getting Started

### Requirements

Ensure you have the following installed on your computer:

- **Node.js** (v14.x or later)
- **npm** (v6.x or later)

### Quickstart

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd pythagora-lab
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   node server.js
   ```

4. **Access the application**:
   Open your web browser and navigate to `http://localhost:3000`.

### License

```
Copyright (c) 2024.
```