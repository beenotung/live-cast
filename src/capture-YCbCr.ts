import robot from 'robotjs'
import {
  createEmptyPalette,
  Index,
  initEvenPalette,
  PaletteTable,
} from './palette-YCbCr'
import zlib from 'zlib'
import { h, max_size, offset, paletteSize, w } from './config'
import {
  ColorArray,
  R,
  G,
  B,
  Y,
  Cb,
  Cr,
  rgbToYCbCr,
  rgbFromYCbCr,
} from './color'

let [dx, dy] = offset

let paletteSampleStep = 4 * ((w * h) / paletteSize / 100)

let palette = createEmptyPalette(paletteSize)
initEvenPalette(palette)
let paletteTable: PaletteTable = new Array(256 ** 3)

let colorGroup = palette.map((code, i) => {
  let r = (code >> 16) & 255
  let g = (code >> 8) & 255
  let b = (code >> 0) & 255
  let color: ColorArray = [r, g, b, 0, 0, 0]
  rgbToYCbCr(color)
  return { color, index: i, count: 0 }
})

function findClosestColorGroup(color: ColorArray) {
  let minGroup = colorGroup[0]
  let dY = color[Y] - minGroup.color[Y]
  let dCb = color[Cb] - minGroup.color[Cb]
  let dCr = color[Cr] - minGroup.color[Cr]
  let minD2 = dY * dY + dCb * dCb + dCr * dCr

  for (let i = 1; i < paletteSize; i++) {
    let eachGroup = colorGroup[i]
    dY = color[Y] - eachGroup.color[Y]
    dCb = color[Cb] - eachGroup.color[Cb]
    dCr = color[Cr] - eachGroup.color[Cr]
    let eachD2 = dY * dY + dCb * dCb + dCr * dCr
    if (eachD2 < minD2) {
      minD2 = eachD2
      minGroup = eachGroup
    }
  }

  return minGroup
}

export let message = Buffer.alloc(max_size)
let encodedImage = Buffer.alloc((w * h) / 2)

let color: ColorArray = [0, 0, 0, 0, 0, 0]
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

    color[R] = r
    color[G] = g
    color[B] = b
    rgbToYCbCr(color)
    let group = findClosestColorGroup(color)

    let oldCount = group.count
    let newCount = oldCount + 1
    for (let i = Y; i <= Cr; i++) {
      group.color[i] = (group.color[i] * oldCount + color[i]) / newCount
    }
    group.count = newCount
  }

  // update color palette
  paletteTable.fill(null)
  colorGroup.forEach((group, i) => {
    rgbFromYCbCr(group.color)
    let [r, g, b] = group.color
    palette[i] = (r << 16) | (g << 8) | (b << 0)
  })

  // encode image
  let pix = 0
  function getIndex(i: number) {
    let b = image[i + 0]
    let g = image[i + 1]
    let r = image[i + 2]
    let code = (r << 16) | (g << 8) | (b << 0)
    let match = paletteTable[code]
    let index: number
    if (!match) {
      color[R] = r
      color[G] = g
      color[B] = b
      rgbToYCbCr(color)
      let group = findClosestColorGroup(color)
      index = group.index
      match = [group.color, group.index]
      paletteTable[code] = match
    } else {
      index = match[Index]
    }
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
  message[offset++] = ((mouse.x - dx) >> 8) & 255
  message[offset++] = ((mouse.x - dx) >> 0) & 255
  message[offset++] = ((mouse.y - dy) >> 8) & 255
  message[offset++] = ((mouse.y - dy) >> 0) & 255
  for (let group of colorGroup) {
    message[offset++] = Math.round(group.color[R])
    message[offset++] = Math.round(group.color[G])
    message[offset++] = Math.round(group.color[B])
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
