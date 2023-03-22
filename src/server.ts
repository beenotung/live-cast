import dgram from 'dgram'
import os from 'os'
import { getFPS, startFPS } from './fps'
import { clientPort, serverPort } from './config'
import { capture, message } from './capture-v2'
import { env } from './env'

let socket = dgram.createSocket('udp4')

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
  let len = capture()
  socket.send(message, 0, len, clientPort, broadcastAddress, err => {
    if (err) {
      console.log(err)
      return
    }
    frame++
    let rate = getFPS().toFixed(1)
    process.stdout.write(`\r  frame ${frame} | ${rate} fps  `)
    tickLater()
  })
}

let tickLater: () => void = () => setImmediate(tick)

if (env.FPS > 0) {
  let interval = 1000 / env.FPS
  tickLater = () => setTimeout(tick, interval)
}

socket.bind(serverPort, () => {
  let address = socket.address()
  console.log('UDP server listening on', address)
  socket.setBroadcast(true)
  startFPS()
  setImmediate(tick)
})
