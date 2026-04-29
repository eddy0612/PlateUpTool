#!/usr/bin/env node
const express = require('express')
const path = require('path')
const fs = require('fs')

const BASE = process.env.BASE_PATH || '/PlateUpTool'
const PORT = process.env.PORT || 4173

// Candidate locations for the built dist folder (root/dist or root/src/dist)
const candidateDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(__dirname, '..', 'src', 'dist'),
  path.join(__dirname, 'dist')
]

let distDir = null
for (const p of candidateDistPaths) {
  if (fs.existsSync(p)) { distDir = p; break }
}

if (!distDir) {
  console.error('No dist directory found. Run the build first (e.g. cd src && npm run build).')
  console.error('Tried:', candidateDistPaths.join('\n  - '))
  process.exit(1)
}

const app = express()
app.use(BASE, express.static(distDir))

app.get(BASE, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

// Use a RegExp route to avoid path-to-regexp parsing errors for wildcard bases
const escapeForRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const baseRegex = new RegExp('^' + escapeForRegExp(BASE) + '(?:/.*)?$')
app.get(baseRegex, (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Serving ${distDir} at http://localhost:${PORT}${BASE}/`)
})
