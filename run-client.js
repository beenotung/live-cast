const { execSync } = require('child_process')
const { writeFileSync } = require('fs')

let pkg = require('./package.json')
delete pkg.dependencies['robotjs']
let text = JSON.stringify(pkg, null, 2)
writeFileSync('package.json', text + '\n')

execSync('npm i')
execSync('npm run build')
execSync('npm i', { cwd: 'my-app' })
execSync('npm start', { cwd: 'my-app' })
