# Pythagora Lab

Pythagora Lab is an innovative web application designed to empower users to interactively view and analyze data from SQLite databases. Focused on project management, it allows users to load a database, select projects, and delve into detailed project states including tasks, files, and LLM requests/responses, providing a comprehensive overview of project development stages.

## Overview

The application employs a traditional web architecture, leveraging a Node.js backend with Express for efficient routing and SQLite for robust data storage and querying capabilities. The frontend is crafted using Bootstrap, ensuring a responsive and intuitive user interface. Server-rendered views via EJS facilitate dynamic content display, creating a seamless user experience. This blend of technologies ensures a scalable, maintainable, and user-friendly application.

**Project Structure:**
- Backend logic is housed within the Node.js environment, utilizing Express for handling web requests and responses.
- SQLite serves as the database, storing detailed information about projects, their states, and associated data.
- The frontend utilizes Bootstrap and EJS for styling and templating, respectively, offering a dynamic and interactive user interface.
- File uploads are managed by Multer, enabling users to easily upload SQLite databases for analysis.

## Features

- **Database Upload:** Users can upload SQLite database files directly from their disk, making data readily accessible for analysis.
- **Project Selection:** A dropdown menu allows users to select from available projects within the loaded database, facilitating targeted analysis.
- **Detailed Project States:** The application displays project states in a scrollable list, including essential details like tasks, steps, and files, enhanced with a search feature for efficient data navigation.
- **Interactive Data Exploration:** Clicking on specific data points within a project state reveals further details, such as task descriptions, file contents, and LLM request/response pairs, offering in-depth insights.
- **Responsive Design:** Built with Bootstrap, the UI adapts seamlessly across devices, ensuring a consistent and accessible user experience.

## Getting Started

### Requirements

To run Pythagora Lab, ensure your system meets the following requirements:
- Node.js (latest stable version recommended)
- npm (comes with Node.js)
- SQLite3

### Quickstart

1. **Clone the repository:**
```bash
git clone [repository-url]
```
2. **Navigate to the project directory:**
```bash
cd Pythagora-Lab
```
3. **Install dependencies:**
```bash
npm install
```
4. **Start the application:**
```bash
npm start
```
This command runs the app in development mode. Open http://localhost:3000 to view it in the browser.

5. **Upload a Database:**
- Navigate to the home page (`http://localhost:3000`).
- Use the "Upload Database File" form to select and upload your SQLite database file.

6. **Analyze Projects:**
- After uploading, select a project and branch to view detailed project states and associated data.

### License

Copyright (c) 2024.

This software is proprietary and may not be copied, modified, or distributed without express written permission from the owner.