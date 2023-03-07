import os from 'os'
import { getFPS, startFPS } from './fps'
import { clientPort, max_size, serverPort } from './config'
import { encodeColor } from './color'
import { Capture, captures, partsCount, captureFullScreen } from './screenshot'
import ws from 'ws'

let wss = new ws.Server({ port: clientPort })

wss.on('connection', (socket, req) => {
  console.log('connection established:', req.socket.remoteAddress)
})

let address = Object.values(os.networkInterfaces())
  .flatMap(s => s)
  .find(s => s?.address.startsWith('192.'))!

console.log(address)

// let broadcastAddress = '192.168.80.255'
// let broadcastAddress = '192.168.1.255'
let broadcastAddress = address.address.split('.').slice(0, 3).join('.') + '.255'

console.log({ broadcastAddress })

let frame = 0

function tick() {
  let data = captureFullScreen()
  wss.clients.forEach(socket => {
    socket.send(data, err => {
      if (err) {
        console.log(err)
        return
      }
    })
  })
  frame++
  let rate = (getFPS() / partsCount).toFixed(0)
  process.stdout.write(`\r  frame ${frame} | ${rate} fps  `)
  setImmediate(tick)
  // setTimeout(tick, 1000 / 3)
}
setImmediate(tick)

wss.on('listening', () => {
  let address = wss.address()
  console.log('UDP server listening on', address)
  startFPS()
  tick()
})
