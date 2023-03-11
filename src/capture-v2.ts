import robot from 'robotjs'
import {
  createEmptyPalette,
  initEvenPalette,
  initPaletteKMean,
  PaletteTable,
  saveCapture,
} from './palette'
import { h, offset, w } from './screenshot'
import zlib from 'zlib'
import { max_size } from './config'
import jpeg from 'jpeg-js'
import { writeFileSync } from 'fs'

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

export function capture() {
  let capture = robot.screen.capture(offset[0], offset[1], w, h)
  saveCapture(capture, 'sample-in.jpg')
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

  // compress image
  let start = 0
  let end = encodedImage.length
  let len = end
  let compressedImage = zlib.gzipSync(encodedImage)
  let max_payload = max_size - 1
  while (compressedImage.length > max_payload) {
    let excess = compressedImage.length - max_payload
    let delta = Math.ceil(excess / w / 5) * w * 5 * 10
    len -= delta
    start =
      Math.floor((Math.random() * (encodedImage.length - len)) / w / 5) * w * 5
    end = start + len
    compressedImage = zlib.gzipSync(encodedImage.subarray(start, end))
  }

  message[0] = start / w / 5
  compressedImage.copy(message, 1)

  len = compressedImage.length + 1
  return len
}

function test() {
  let len = capture()

  let compressedImage = message.subarray(1, 1 + len)
  let encodedImage = zlib.gunzipSync(compressedImage)
  let n = encodedImage.length

  let start = message[0] * w * 5

  let rawImage = Buffer.alloc(w * h * 4)

  // decode image
  function putIndex(i: number, code: number) {
    let r = (code >> 16) & 255
    let g = (code >> 8) & 255
    let b = (code >> 0) & 255
    rawImage[i + 0] = r
    rawImage[i + 1] = g
    rawImage[i + 2] = b
  }
  for (let pix = 0, i = start * 4 * 2; pix < n; pix++) {
    let index = encodedImage[pix]
    let hi = (index >> 4) & 15
    let lo = (index >> 0) & 15
    putIndex(i, palette[hi])
    i += 4
    putIndex(i, palette[lo])
    i += 4
  }
  let jpegImage = jpeg.encode({ width: w, height: h, data: rawImage })
  writeFileSync('sample-out.jpg', jpegImage.data)
}

test()
