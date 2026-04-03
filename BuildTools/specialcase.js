#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: node specialcase.js <path-to-json> <path-to-directory>');
  process.exit(1);
}

const jsonPath = args[0];
const dirPath = args[1];

// Validate inputs
if (!fs.existsSync(jsonPath)) {
  console.error(`Error: JSON file not found: ${jsonPath}`);
  process.exit(1);
}

if (!fs.existsSync(dirPath)) {
  console.error(`Error: Directory not found: ${dirPath}`);
  process.exit(1);
}

// Read and parse JSON file
let jsonData;

try {
  let fileContent = fs.readFileSync(jsonPath, 'utf8');
  jsonData = JSON.parse(fileContent);
} catch (err) {
  console.error(`Error parsing JSON file: ${err.message}`);
  process.exit(1);
}

// Ensure jsonData is an array
if (!Array.isArray(jsonData)) {
  console.error('Error: JSON must be an array of objects');
  process.exit(1);
}

jsonData.forEach((item) => {

  // Remove files told to delete
  item.Delete.forEach((special) => {
    if (fs.existsSync(dirPath + "/AppliancePicture/" + special.filename)) {
      console.log("Removing special case " + special.filename + ", reason:" + special.reason);
      fs.unlinkSync(dirPath + "/AppliancePicture/" + special.filename);
    } else {
      console.log("Warning! Special case " + special.filename + " expected but not found");
    }
  });

});


process.exit(0);
