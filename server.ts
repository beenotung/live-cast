import dgram from 'dgram'
import os from 'os'
import { getFPS, startFPS } from './fps'
import { clientPort, max_size, serverPort } from './config'
import { encodeColor } from './color'
import { screenshot } from './screenshot'

let socket = dgram.createSocket('udp4')

let address = Object.values(os.networkInterfaces())
  .flatMap(s => s)
  .find(s => s?.address.startsWith('192.'))!

console.log(address)

// let broadcastAddress = '192.168.80.255'
// let broadcastAddress = '192.168.1.255'
let broadcastAddress = address.address.split('.').slice(0, 3).join('.') + '.255'

console.log({ broadcastAddress })

let lastImage: Buffer = screenshot()
let n = lastImage.length

console.log({ n })

for (let i = 0; i < n; i++) {
  lastImage[i] = 0
}

let frame = 0

function tick() {
  frame++

  let data: Buffer = screenshot()
  let n = data.length

  let offset = 0
  let sentBytes = 1
  function loop(i: number) {
    if (sentBytes == n) {
      let rate = getFPS()

      let frags = (sentBytes / (max_size - 1)).toFixed(2)
      process.stdout.write(
        `\r  frame ${frame} | ${rate} fps | ${frags} frags  `,
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
