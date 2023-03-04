import dgram from 'dgram'
import { clientPort } from './config'
import { getFPS, startFPS } from './fps'
import { decodeColor } from './color'

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
  frame++
  let size = rinfo.size - 3

  let offset =
    (msg[size + 0] << 0) | (msg[size + 1] << 8) | (msg[size + 2] << 16)

  for (let i = 0; i < size; i += 2) {
    // let code = msg[i]
    let code = (msg[i + 0] << 0) | (msg[i + 1] << 8)
    decodeColor(code, data, offset)
    offset += 4
  }
  context.putImageData(imageData, 0, 0)

  let rate = getFPS()

  process.stdout.write(
    `\r  frame ${frame} | ${rate} fps | size ${size} | offset ${offset}  `,
  )
})

socket.bind(clientPort)
