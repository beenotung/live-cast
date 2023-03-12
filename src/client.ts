document.querySelector('#msg')?.remove()

import dgram from 'dgram'
import { clientPort, h, w } from './config'
import { getFPS, startFPS } from './fps'
import zlib from 'zlib'

let socket = dgram.createSocket('udp4')

let canvas = document.querySelector('canvas#remote') as HTMLCanvasElement
canvas.hidden = false

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

let paletteSize = 16
let palette = new Array<{ r: number; g: number; b: number }>(paletteSize)

socket.on('listening', () => {
  let address = socket.address()
  console.log('UDP client listening on', address)
  socket.setBroadcast(true)
  startFPS()
})

socket.on('message', (message, rinfo) => {
  let size = rinfo.size

  let len = message.length

  let offset = 0
  let x = (message[offset++] << 8) | (message[offset++] << 0)
  let y = (message[offset++] << 8) | (message[offset++] << 0)
  for (let i = 0; i < paletteSize; i++) {
    let r = message[offset++]
    let g = message[offset++]
    let b = message[offset++]
    palette[i] = { r, g, b }
  }

  let start = message[offset++] * w * 5
  let compressedImage = message.subarray(offset, len)
  let encodedImage = zlib.gunzipSync(compressedImage)
  let n = encodedImage.length

  // decode image
  for (let pix = 0, i = start * 4 * 2; pix < n; pix++) {
    let index = encodedImage[pix]
    let hi = (index >> 4) & 15
    let lo = (index >> 0) & 15
    let color = palette[hi]
    data[i++] = color.r
    data[i++] = color.g
    data[i++] = color.b
    i++
    color = palette[lo]
    data[i++] = color.r
    data[i++] = color.g
    data[i++] = color.b
    i++
  }

  context.putImageData(imageData, 0, 0)

  frame++

  let rate = getFPS().toFixed(0)

  process.stdout.write(`\r  frame ${frame} | ${rate} fps | size ${size}  `)
})

socket.bind(clientPort)
