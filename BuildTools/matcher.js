#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);


if (args.length < 2) {
  console.error('Usage: node matcher.js <path-to-json> <path-to-directory> [destination-directory]');
  process.exit(1);
}

const jsonPath = args[0];
const dirPath = args[1];
const destDir = args[2];


// Validate inputs
if (!fs.existsSync(jsonPath)) {
  console.error(`Error: JSON file not found: ${jsonPath}`);
  process.exit(1);
}

if (!fs.existsSync(dirPath)) {
  console.error(`Error: Directory not found: ${dirPath}`);
  process.exit(1);
}

if (destDir && !fs.existsSync(destDir)) {
  // Try to create the destination directory if it doesn't exist
  try {
    fs.mkdirSync(destDir, { recursive: true });
  } catch (err) {
    console.error(`Error creating destination directory: ${err.message}`);
    process.exit(1);
  }
}

// Read and parse JSON file
let jsonData;
try {
  let fileContent = fs.readFileSync(jsonPath, 'utf8');

  // Remove metadata line if present (files starting with "unknown parameter")
  const lines = fileContent.split('\n');
  if (lines[0].includes('unknown parameter') || !lines[0].trim().startsWith('[')) {
    fileContent = lines.slice(1).join('\n');
  }

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

// Read directory contents
let files;
try {
  files = fs.readdirSync(dirPath);
} catch (err) {
  console.error(`Error reading directory: ${err.message}`);
  process.exit(1);
}

// Convert file names to lowercase for case-insensitive matching
const filesLower = files.map(f => ({ original: f, lower: f.toLowerCase() }));

// Function to clean name: remove spaces, hyphens, and quotes
function cleanName(name) {
  return name.replace(/[\s\-"]/g, '').toLowerCase();
}

// Function to find matching file
function findMatchingFile(cleanedName) {
  // Pattern: {cleanedName}-{digits/hyphens}[Provider].png
  // Examples:
  //   HeatedMixer-505496455.png (single hyphen)
  //   GrabberRotating--331651461.png (double hyphen)
  //   Turkey--1506824829.png
  //   Lettuce--65594226-Provider.png
  const patterns = [
    new RegExp(`^${cleanedName}-+[\\d-]+(?:provider)?\\.png$`, 'i'),
  ];

  let foundname = null;
  for (const pattern of patterns) {
    for (const file of filesLower) {
      if (pattern.test(file.lower)) {
        if (foundname != null) {
          console.log("ERROR: Multi hit on " + file.original + " / " + foundname + " : Fix up exclude list");
        } else {
          foundname = file.original;
        }
      }
    }
  }

  return foundname;
}

// Process each entry in the JSON array, warn on duplicate 'Name' fields
const results = {
  matched: [],
  unmatched: []
};

const seenNames = new Set();


// Track how many entries are actually processed (not skipped due to duplicate)
let processedCount = 0;
jsonData.forEach((item, lineNumber) => {
  if (!item.Name) {
    results.unmatched.push({
      line: lineNumber + 1,
      name: 'N/A (missing Name field)',
      reason: 'Missing "Name" field'
    });
    processedCount++;
    return;
  }

  const name = item.Name;
  if (seenNames.has(name)) {
    console.warn(`WARNING: Duplicate Name '${name}' found at line ${lineNumber + 1}. Only the first occurrence is used.`);
    return;
  }
  seenNames.add(name);
  processedCount++;

  const cleanedName = cleanName(name);
  const matchedFile = findMatchingFile(cleanedName);

  if (matchedFile) {
    results.matched.push({
      line: lineNumber + 1,
      name: name,
      cleanedName: cleanedName,
      filename: matchedFile
    });

    // If destDir is provided, copy the file
    if (destDir) {
      const srcFile = path.join(dirPath, matchedFile);
      const destFile = path.join(destDir, matchedFile);
      try {
        fs.copyFileSync(srcFile, destFile);
        // Optionally, log the copy
        // console.log(`Copied: ${srcFile} -> ${destFile}`);
      } catch (err) {
        console.error(`Error copying file ${matchedFile}: ${err.message}`);
      }
    }
  } else {
    results.unmatched.push({
      line: lineNumber + 1,
      name: name,
      cleanedName: cleanedName
    });
  }
});

// Output results
console.log('\n========== MATCHED ENTRIES ==========\n');
results.matched.forEach(entry => {
  console.log(`Line ${entry.line}: "${entry.name}" -> ${entry.filename}`);
});

if (results.matched.length === 0) {
  console.log('(No matches found)');
}

console.log('\n========== UNMATCHED ENTRIES ==========\n');
results.unmatched.forEach(entry => {
  console.log(`Line ${entry.line}: "${entry.name}"`);
});

if (results.unmatched.length === 0) {
  console.log('(All entries matched!)');
}


console.log('\n========== SUMMARY ==========\n');
console.log(`Total processed entries: ${processedCount}`);
console.log(`Matched: ${results.matched.length}`);
console.log(`Unmatched: ${results.unmatched.length}`);
console.log(`Match rate: ${processedCount === 0 ? '0.00' : ((results.matched.length / processedCount) * 100).toFixed(2)}%`);

// Save to JSON
const jsonMapPath = path.join(path.dirname(jsonPath), 'ApplianceMap.json');
try {
  const jsonMap = results.matched.map(entry => ({
    name: entry.name,
    filename: entry.filename
  }));

  // Filter out any duplicates
  let uniqueMap = Object.values(jsonMap.reduce((r, o) => {
        r[o.name] = r[o.name] || o;
        return r;
      },{}));

  fs.writeFileSync(jsonMapPath, JSON.stringify(uniqueMap, null, 2), 'utf8');
  console.log(`JSON map saved to: ${jsonMapPath}`);
} catch (err) {
  console.error(`Error saving JSON map: ${err.message}`);
}
