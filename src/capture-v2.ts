import robot from 'robotjs'
import {
  createEmptyPalette,
  initEvenPalette,
  PaletteTable,
  saveCapture,
} from './palette'
import { h, offset, w } from './screenshot'
import zlib from 'zlib'
import { max_size } from './config'
import jpeg from 'jpeg-js'
import { writeFileSync } from 'fs'

let [dx, dy] = offset

let paletteSampleStep = 4 * 1

let paletteSize = 16
let palette = createEmptyPalette(paletteSize)
initEvenPalette(palette)
let paletteTable: PaletteTable = new Array(256 ** 3)

let colorGroup = palette.map((code, i) => {
  let r = (code >> 16) & 255
  let g = (code >> 8) & 255
  let b = (code >> 0) & 255
  return { r, g, b, index: i, count: 0 }
})

function findClosestColorGroup(r: number, g: number, b: number) {
  let minGroup = colorGroup[0]
  let dr = r - minGroup.r
  let dg = g - minGroup.g
  let db = b - minGroup.b
  let minD2 = dr * dr + dg * dg + db * db

  for (let i = 1; i < paletteSize; i++) {
    let eachGroup = colorGroup[i]
    dr = r - eachGroup.r
    dg = g - eachGroup.g
    db = b - eachGroup.b
    let eachD2 = dr * dr + dg * dg + db * db
    if (eachD2 < minD2) {
      minD2 = eachD2
      minGroup = eachGroup
    }
  }

  return minGroup
}

export let message = Buffer.alloc(max_size)
let encodedImage = Buffer.alloc((w * h) / 2)

export function capture(capture = robot.screen.capture(dx, dy, w, h)) {
  let mouse = robot.getMousePos()
  let image: Buffer = capture.image
  let n = image.length

  // sample palette from image
  colorGroup.forEach(group => (group.count = 0))
  for (let i = 0; i < n; i += paletteSampleStep) {
    let b = image[i + 0]
    let g = image[i + 1]
    let r = image[i + 2]

    let group = findClosestColorGroup(r, g, b)

    let oldCount = group.count
    let newCount = oldCount + 1
    group.r = (group.r * oldCount + r) / newCount
    group.g = (group.g * oldCount + g) / newCount
    group.b = (group.b * oldCount + b) / newCount
    group.count = newCount
  }

  // update color palette
  paletteTable.fill(null)
  colorGroup.forEach(
    (group, i) =>
      (palette[i] = (group.r << 16) | (group.g << 8) | (group.b << 0)),
  )

  // encode image
  let pix = 0
  function getIndex(i: number) {
    let b = image[i + 0]
    let g = image[i + 1]
    let r = image[i + 2]
    let code = (r << 16) | (g << 8) | (b << 0)
    let match = paletteTable[code]
    if (!match) {
      let group = findClosestColorGroup(r, g, b)
      match = [group.r, group.g, group.b, group.index]
      paletteTable[code] = match
    }
    let index = match[3]
    return index
  }
  for (let i = 0; i < n; ) {
    let hi = getIndex(i)
    i += 4
    let lo = getIndex(i)
    i += 4
    encodedImage[pix] = (hi << 4) | (lo << 0)
    pix++
  }

  // compose message
  let offset = 0
  message[offset++] = (mouse.x >> 8) & 255
  message[offset++] = (mouse.x >> 0) & 255
  message[offset++] = (mouse.y >> 8) & 255
  message[offset++] = (mouse.y >> 0) & 255
  for (let group of colorGroup) {
    message[offset++] = Math.round(group.r)
    message[offset++] = Math.round(group.g)
    message[offset++] = Math.round(group.b)
  }

  // compress image
  let start = 0
  let end = encodedImage.length
  let len = end
  let compressedImage = zlib.gzipSync(encodedImage)
  let max_payload = max_size - offset - 1
  while (compressedImage.length > max_payload) {
    let excess = compressedImage.length - max_payload
    let delta = Math.ceil(excess / w / 5) * w * 5 * 10
    len -= delta
    start =
      Math.floor((Math.random() * (encodedImage.length - len)) / w / 5) * w * 5
    end = start + len
    // console.log({ delta, c: compressedImage.length })
    compressedImage = zlib.gzipSync(encodedImage.subarray(start, end))
  }

  message[offset++] = start / w / 5
  compressedImage.copy(message, offset)

  len = compressedImage.length + offset
  return len
}

function test() {
  type Color = { r: number; g: number; b: number }

  let captureImage = robot.screen.capture(dx, dy, w, h)
  saveCapture(captureImage, 'sample-in.jpg')
  let len = capture(captureImage)

  let offset = 0
  let x = (message[offset++] << 8) | (message[offset++] << 0)
  let y = (message[offset++] << 8) | (message[offset++] << 0)
  let palette = new Array<Color>(16)
  for (let i = 0; i < 16; i++) {
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
