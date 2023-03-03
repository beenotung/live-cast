import robot from 'robotjs'
import dgram from 'dgram'
import os from 'os'
import { getFPS, startFPS } from './fps'
import { clientPort, serverPort } from './config'

let socket = dgram.createSocket('udp4')

let size = 65500

let address = Object.values(os.networkInterfaces())
  .flatMap(s => s)
  .find(s => s?.address.startsWith('192.'))

console.log(address)

let broadcastAddress = '192.168.80.255'
console.log({ broadcastAddress })

let lastCapture = robot.screen.capture()

console.log(lastCapture)

let MODE_RGB = 3
let MODE_RGBA = 4

let mode = lastCapture.bytesPerPixel

let lastImage: Buffer = lastCapture.image
let n = lastImage.length

let frame = 0
let offset = 0

function tick() {
  frame++

  let newCapture = robot.screen.capture()
  let newImage: Buffer = newCapture.image
  // let offset = 0
  // for (let i = 0; i < n; i++) {
  //   if (newImage[i] != lastImage[i]) {
  //     offset = i
  //     break
  //   }
  // }

  let remind = n - offset
  let len = Math.min(remind, size)

  newImage.copy(lastImage, offset, offset, offset + len)

  let message = Buffer.from(newImage, offset, size)
  socket.send(
    message,
    offset,
    len,
    clientPort,
    broadcastAddress,
    (err, bytes) => {
      let rate = getFPS()

      process.stdout.write(
        `\r  frame ${frame} | ${rate} fps | offset ${offset} | err ${err} | ${bytes} bytes  `,
      )

      offset = (offset + len) % n
      setImmediate(tick)
    },
  )
}

socket.bind(serverPort, () => {
  let address = socket.address()
  console.log('UDP server listening on', address)
  socket.setBroadcast(true)
  startFPS()
  setImmediate(tick)
})
