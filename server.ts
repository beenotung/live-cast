import robot from 'robotjs'
import dgram from 'dgram'
import os from 'os'
import { getFPS, startFPS } from './fps'
import { clientPort, serverPort } from './config'
import { encodeColor } from './color'

let socket = dgram.createSocket('udp4')

let max_size = 65507
max_size = 3 + 64800 // 1080 x 60
max_size -= 3

let address = Object.values(os.networkInterfaces())
  .flatMap(s => s)
  .find(s => s?.address.startsWith('192.'))!

console.log(address)

// let broadcastAddress = '192.168.80.255'
// let broadcastAddress = '192.168.1.255'
let broadcastAddress = address.address.split('.').slice(0, 3).join('.') + '.255'

console.log({ broadcastAddress })

let lastCapture = robot.screen.capture()

console.log(lastCapture)

let lastImage: Buffer = lastCapture.image
let n = lastImage.length

console.log({ n })

for (let i = 0; i < n; i++) {
  lastImage[i] = 0
}

let newCapture = robot.screen.capture()
let newImage: Buffer = newCapture.image

let frame = 0
let offset = 0

let message = Buffer.alloc(max_size + 3)
message = Buffer.alloc(2 ** 32)

function tick() {
  frame++

  for (let i = 0; i < n; i++) {
    if (
      newImage[offset + 0] != lastImage[offset + 0] ||
      newImage[offset + 1] != lastImage[offset + 1] ||
      newImage[offset + 2] != lastImage[offset + 2]
    ) {
      break
    }
    // offset = (offset + 4) % n
    offset += 4
    if (offset >= n) {
      offset = 0
      newCapture = robot.screen.capture()
      newImage = newCapture.image
    }
  }

  let size = max_size

  message[size + 0] = (offset >> 0) & 255
  message[size + 1] = (offset >> 8) & 255
  message[size + 2] = (offset >> 16) & 255

  for (let i = 0; i < size; i += 2) {
    let b = newImage[offset + 0]
    let g = newImage[offset + 1]
    let r = newImage[offset + 2]
    let code = encodeColor(r, g, b)
    // message[i] = code
    message[i + 0] = (code >> 0) & 255
    message[i + 1] = (code >> 8) & 255
    lastImage[offset + 0] = b
    lastImage[offset + 1] = g
    lastImage[offset + 2] = r
    // offset = (offset + 4) % n
    offset += 4
    if (offset == n) {
      offset = 0
      newCapture = robot.screen.capture()
      newImage = newCapture.image
    }
  }

  socket.send(
    message,
    0,
    size + 3,
    clientPort,
    broadcastAddress,
    (err, bytes) => {
      let rate = getFPS()

      process.stdout.write(
        `\r  frame ${frame} | ${rate} fps | offset ${offset} | err ${err} | ${bytes} bytes  `,
      )

      // setImmediate(tick)
    },
  )
}

socket.bind(serverPort, () => {
  let address = socket.address()
  console.log('UDP server listening on', address)
  socket.setBroadcast(true)
  startFPS()
  // setImmediate(tick)
  // setInterval(tick, 33)
  setInterval(tick, 33 * 5)
})
