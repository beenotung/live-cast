#!/usr/bin/env node

let { execSync } = require('child_process')

execSync('npm install', {
  cwd: __dirname,
})

execSync('npm start', {
  cwd: __dirname,
})
