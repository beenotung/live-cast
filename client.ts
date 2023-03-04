import dgram from 'dgram'
import { clientPort, max_size } from './config'
import { getFPS, startFPS } from './fps'
import { decodeColor } from './color'
import jpeg from 'jpeg-js'
import { parts, partsCount } from './screenshot'

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

socket.on('message', (msg, rinfo) => {
  let size = rinfo.size

  let partId = msg[0] as 0
  msg[0] = 255

  let rawData = jpeg.decode(msg).data

  let [offsetX, offsetY] = parts[partId]

  let i = 0
  for (let yi = 0; yi < parts.h; yi++) {
    let y = offsetY + yi

    for (let xi = 0; xi < parts.w; xi++) {
      let x = offsetX + xi

      let offset = (y * w + x) * 4

      let r = rawData[i + 0]
      let g = rawData[i + 1]
      let b = rawData[i + 2]

      data[offset + 0] = r
      data[offset + 1] = g
      data[offset + 2] = b

      i += 4
    }
  }

  context.putImageData(imageData, 0, 0)

  frame++

  let rate = (getFPS() / partsCount).toFixed(0)

  process.stdout.write(
    `\r  frame ${frame} | ${rate} fps | size ${size} | p ${partId}  `,
  )
})

socket.bind(clientPort)
