import { writeFileSync } from 'fs'
import robot from 'robotjs'
import { capture, message } from './capture-v2'
import { h, offset, paletteSize, w } from './config'
import { saveCapture } from './dev-utils'
import zlib from 'zlib'
import jpeg from 'jpeg-js'

let [dx, dy] = offset

function test() {
  let captureImage = robot.screen.capture(dx, dy, w, h)
  saveCapture(captureImage, 'sample-in.jpg')
  let len = capture(captureImage)

  let offset = 0
  let x = (message[offset++] << 8) | (message[offset++] << 0)
  let y = (message[offset++] << 8) | (message[offset++] << 0)
  let palette = new Array<{ r: number; g: number; b: number }>(paletteSize)
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

  let rawImage = Buffer.alloc(w * h * 4)

  // decode image
  for (let pix = 0, i = start * 4 * 2; pix < n; pix++) {
    let index = encodedImage[pix]
    let hi = (index >> 4) & 15
    let lo = (index >> 0) & 15
    let color = palette[hi]
    rawImage[i++] = color.r
    rawImage[i++] = color.g
    rawImage[i++] = color.b
    i++
    color = palette[lo]
    rawImage[i++] = color.r
    rawImage[i++] = color.g
    rawImage[i++] = color.b
    i++
  }
  let jpegImage = jpeg.encode({ width: w, height: h, data: rawImage })
  writeFileSync('sample-out.jpg', jpegImage.data)
}

test()
