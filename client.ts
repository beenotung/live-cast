import dgram from 'dgram'
import { clientPort } from './config'
import { getFPS, startFPS } from './fps'

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

let frame = 0
let offset = 0

socket.on('listening', () => {
  let address = socket.address()
  console.log('UDP client listening on', address)
  socket.setBroadcast(true)
  startFPS()
})

socket.on('message', (msg, rinfo) => {
  frame++
  let size = msg.length
  for (let i = 0; i < size; i++) {
    data[i + offset] = msg[i]
  }
  context.putImageData(imageData, 0, 0)

  let rate = getFPS()

  process.stdout.write(`\r  frame ${frame} | ${rate} fps | offset ${offset}  `)

  offset = (offset + size) % n
})

socket.bind(clientPort)
