import { capture } from './capture-v2'
import { getFPS, startFPS } from './fps'

startFPS()
function test() {
  capture()
  let fps = getFPS().toFixed(0)
  process.stdout.write(`\r ${fps} fps  `)
  setImmediate(test)
}

test()
