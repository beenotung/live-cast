#!/usr/bin/env node

process.argv[1] = require.resolve('@electron-forge/cli/dist/electron-forge.js')
process.argv[2] = 'start'
require('@electron-forge/cli/dist/electron-forge.js')
