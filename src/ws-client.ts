document.querySelector('#msg')?.remove()

import { clientPort, max_size } from './config'
import { getFPS, startFPS } from './fps'
import { decodeColor } from './color'
import jpeg from 'jpeg-js'
import { h, parts, partsCount, w } from './screenshot'

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

function startSocket() {
  let frame = 0

  let socket = new WebSocket('ws://localhost:' + clientPort)

  socket.onopen = () => {
    console.log('socket opened')
    startFPS()
  }

  socket.onmessage = async event => {
    let blob = event.data as Blob
    let size = blob.size

    console.log('socket message:', size)

    let msg = new Uint8Array(await blob.arrayBuffer())

    let rawData = jpeg.decode(msg).data

    let [offsetX, offsetY] = [0, 0]

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

    process.stdout.write(`\r  frame ${frame} | ${rate} fps | size ${size}  `)
  }

  socket.onclose = () => {
    console.log('socket closed')
    setTimeout(startSocket, 500 + Math.random() * 3000)
  }
  socket.onerror = error => {
    console.log('socket error:', error)
  }
}

startSocket()
