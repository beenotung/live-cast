import dgram from 'dgram'
import { clientPort, max_size } from './config'
import { getFPS, startFPS } from './fps'
import { decodeColor } from './color'
import jpeg from 'jpeg-js'

let socket = dgram.createSocket('udp4')

let canvas = document.querySelector('canvas#remote') as HTMLCanvasElement

let w = 1920
let h = 1080

canvas.width = w
canvas.height = h

let context = canvas.getContext('2d')!
let imageData = context.getImageData(0, 0, w, h)
let data = imageData.data
let n = data.length

for (let i = 0; i < n; i += 4) {
  // data[i + 0] = 255
  // data[i + 1] = 127
  // data[i + 2] = 63
  data[i + 3] = 255
}
context.putImageData(imageData, 0, 0)

let frame = 0

socket.on('listening', () => {
  let address = socket.address()
  console.log('UDP client listening on', address)
  socket.setBroadcast(true)
  startFPS()
})

let jpegData = Buffer.alloc(1024 * 1024)
jpegData[0] = 255
let jpegSize = 0

let lastI = -1

socket.on('message', (msg, rinfo) => {
  let size = rinfo.size

  let i = msg[0]

  if (i != lastI + 1) {
    lastI = -1
    return
  }
  lastI = i

  let offset = 1 + i * (max_size - 1)

  // console.log({ i })

  if (i == 0) {
    frame++
    if (frame > 1) {
      try {
        let jpegView = jpegData.subarray(0, jpegSize)
        let rawData = jpeg.decode(jpegView).data
        // rawData.copy(data as any, 0, 0, jpegSize)
        for (let i = 0; i < n; i += 4) {
          let b = rawData[i + 0]
          let g = rawData[i + 1]
          let r = rawData[i + 2]
          data[i + 0] = r
          data[i + 1] = g
          data[i + 2] = b
        }

        context.putImageData(imageData, 0, 0)

        let rate = getFPS()

        process.stdout.write(
          `\r  frame ${frame} | ${rate} fps | size ${size} | offset ${offset}  `,
        )
      } catch (error) {
        // due to drop package
        frame--
        console.log(error)
      }
    }
  }

  msg.copy(jpegData, offset, 1, size)
  jpegSize = offset + size - 1
})

socket.bind(clientPort)
