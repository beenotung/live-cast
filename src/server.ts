import dgram from 'dgram'
import { getFPS, startFPS } from './fps'
import { clientPort, serverPort } from './config'
import { capture, message } from './capture-v2'
import { env } from './env'
import { broadcastAddress } from './network'

let socket = dgram.createSocket('udp4')

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
