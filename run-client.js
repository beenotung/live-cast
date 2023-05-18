#!/usr/bin/env node

const { execSync } = require('child_process')
const { writeFileSync } = require('fs')

let pkg = require('./package.json')
delete pkg.dependencies['robotjs']
let text = JSON.stringify(pkg, null, 2)
writeFileSync('package.json', text + '\n')

function run(cmd, { cwd } = {}) {
  let msg = '$ ' + cmd
  if (cwd) {
    msg = cwd + msg
  }
  console.log(msg)
  execSync(cmd, { cwd, stdio: 'inherit' })
}

run('npm install')
run('npm run build')
run('npm install', { cwd: 'live-cast-client' })
run('npm start', { cwd: 'live-cast-client' })
