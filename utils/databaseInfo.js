const fs = require('fs');
const path = require('path');

const DB_INFO_FILE = path.join(__dirname, '..', 'database_info.json');

function loadDatabaseInfo() {
  console.log('Loading database info');
  if (fs.existsSync(DB_INFO_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_INFO_FILE, 'utf8'));
      console.log('Database info loaded successfully');
      return data;
    } catch (error) {
      console.error(`Error loading database info: ${error}`);
      throw error;
    }
  }
  return {};
}

function saveDatabaseInfo(info) {
  console.log('Saving database info');
  try {
    fs.writeFileSync(DB_INFO_FILE, JSON.stringify(info, null, 2));
    console.log('Database info saved successfully');
  } catch (error) {
    console.error(`Error saving database info: ${error}`);
    throw error;
  }
}

function addDatabaseDescription(name, description) {
  console.log(`Adding description for database: ${name}`);
  try {
    const info = loadDatabaseInfo();
    info[name] = { description, name }; // Modified to use the provided name and include it in the info
    saveDatabaseInfo(info);
    console.log(`Description added for database: ${name}`);
  } catch (error) {
    console.error(`Error adding database description for ${name}: ${error}`);
    throw error;
  }
}

function updateDatabaseDescription(name, newDescription) {
  console.log(`Updating description for database: ${name}`);
  try {
    const info = loadDatabaseInfo();
    if (info[name]) {
      info[name].description = newDescription;
      saveDatabaseInfo(info);
      console.log(`Description updated for database: ${name}`);
      return true;
    }
    console.log(`Database ${name} not found for description update`);
    return false;
  } catch (error) {
    console.error(`Error updating database description for ${name}: ${error}`);
    throw error;
  }
}

function getDatabaseDescription(name) {
  console.log(`Retrieving description for database: ${name}`);
  try {
    const info = loadDatabaseInfo();
    const description = info[name] ? info[name].description : '';
    console.log(`Description retrieved for database: ${name}`);
    return description;
  } catch (error) {
    console.error(`Error retrieving database description for ${name}: ${error}`);
    throw error;
  }
}

module.exports = {
  addDatabaseDescription,
  updateDatabaseDescription,
  getDatabaseDescription,
  loadDatabaseInfo,
  saveDatabaseInfo,
};