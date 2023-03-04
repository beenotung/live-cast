import robot from 'robotjs'
import dgram from 'dgram'
import os from 'os'
import { getFPS, startFPS } from './fps'
import { clientPort, max_size, serverPort } from './config'
import { encodeColor } from './color'
import jpeg from 'jpeg-js'
import fs from 'fs'

let quality = 50
let target_frags = 3

let socket = dgram.createSocket('udp4')

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

let frame = 0

function tick() {
  frame++

  let newCapture = robot.screen.capture()
  let newImage: Buffer = newCapture.image

  let data = jpeg.encode(
    {
      width: newCapture.width,
      height: newCapture.height,
      data: newImage,
    },
    quality,
  ).data
  // max_size = 10
  // data = data.subarray(0, 40)
  // for (let i = 1; i < 40; i++) {
  //   data[i] = i
  // }
  let n = data.length
  // let originalData = Buffer.from(data)
  // console.log({ originalData })

  let offset = 0
  // let sent: any[] = []
  let sentBytes = 1
  function loop(i: number) {
    if (sentBytes == n) {
      let rate = getFPS()

      let frags = sentBytes / (max_size - 1)
      if (frags < target_frags) {
        quality++
      } else if (frags > target_frags) {
        quality--
      }
      let f = frags.toFixed(2)
      process.stdout.write(
        `\r  frame ${frame} | ${rate} fps | ${quality} q | ${f} frags  `,
      )

      setImmediate(tick)
      // setTimeout(tick, 200)
      return
    }

    let size = n - offset
    if (size > max_size) {
      size = max_size
    }
    data[offset] = i
    // console.log({ n, i, size, offset })
    // sent.push(Buffer.from(data.subarray(offset, offset + size)))
    socket.send(
      data,
      offset,
      size,
      clientPort,
      broadcastAddress,
      (err, bytes) => {
        if (err) {
          console.log(err)
        }
        offset += size - 1
        sentBytes += size - 1
        loop(i + 1)
      },
    )
  }
  loop(0)
}

socket.bind(serverPort, () => {
  let address = socket.address()
  console.log('UDP server listening on', address)
  socket.setBroadcast(true)
  startFPS()
  setImmediate(tick)
  // setInterval(tick, 33)
  // setInterval(tick, 33 * 5)
  // tick()
  // setTimeout(tick, 1000)
})
