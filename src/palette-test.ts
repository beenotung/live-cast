import robot from 'robotjs'
import jpeg from 'jpeg-js'
import fs from 'fs'
import {
  saveCapture,
  createEmptyPalette,
  initPaletteKMean,
  PaletteTable,
  applyPalette,
  initEvenPalette,
  Palette,
} from './palette'

function sample() {
  console.time('capture')
  let capture = robot.screen.capture()
  console.timeEnd('capture')

  saveCapture(capture, 'original.jpg')

  let palette = createEmptyPalette(256)

  // initEvenPalette(palette)

  console.time('createPaletteKMean')
  initPaletteKMean(palette, capture.image)
  console.timeEnd('createPaletteKMean')

  // console.time('createPaletteCount')
  // let palette = createPaletteCount(capture.image)
  // console.timeEnd('createPaletteCount')

  // console.time('createSamplePalette')
  // let palette = createSamplePalette(capture.image)
  // console.timeEnd('createSamplePalette')

  console.time('savePalette')
  savePalette(palette)
  console.timeEnd('savePalette')

  let paletteTable: PaletteTable = new Array(palette.length)

  console.time('applyPalette')
  applyPalette(capture.image, palette, paletteTable)
  console.timeEnd('applyPalette')

  saveCapture(capture, 'compressed.jpg')
}

function even() {
  let palette = createEmptyPalette(256)
  initEvenPalette(palette)

  console.time('savePalette')
  savePalette(palette)
  console.timeEnd('savePalette')
}

function savePalette(palette: number[]) {
  sortPalette(palette)

  let rawPalette = [0]

  let w = 50
  let h = 50
  let W = w * 16
  let H = h * 16
  for (let i = 0; i < 256; i++) {
    let x0 = i % 16
    let y0 = (i - x0) / 16

    let code = palette[i]
    let r = (code >> 16) & 255
    let g = (code >> 8) & 255
    let b = (code >> 0) & 255

    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        let x = x0 * w + dx
        let y = y0 * h + dy
        let offset = (y * W + x) * 4

        rawPalette[offset + 0] = r
        rawPalette[offset + 1] = g
        rawPalette[offset + 2] = b
        rawPalette[offset + 3] = 255
      }
    }
  }

  let paletteImage = jpeg.encode({
    width: W,
    height: H,
    data: rawPalette,
  })
  fs.writeFileSync('palette.jpg', paletteImage.data)
}

function sortPalette(palette: Palette) {
  let [rx, ry] = [7, 0]
  let [gx, gy] = [0, 15]
  let [bx, by] = [15, 15]

  let r_max_d = 0
  let g_max_d = 0
  let b_max_d = 0

  palette.forEach((_, i) => {
    let x = i % 16
    let y = (i - x) / 16

    let rd = Math.sqrt((rx - x) ** 2 + (ry - y) ** 2)
    if (rd > r_max_d) r_max_d = rd

    let gd = Math.sqrt((gx - x) ** 2 + (gy - y) ** 2)
    if (gd > g_max_d) g_max_d = gd

    let bd = Math.sqrt((bx - x) ** 2 + (by - y) ** 2)
    if (bd > b_max_d) b_max_d = bd
  })

  let input = palette.slice()

  palette.forEach((_, i) => {
    let x = i % 16
    let y = (i - x) / 16

    let r = Math.round(
      (1 - Math.sqrt((x - rx) ** 2 + (y - ry) ** 2) / r_max_d) * 255,
    )
    let g = Math.round(
      (1 - Math.sqrt((x - gx) ** 2 + (y - gy) ** 2) / g_max_d) * 255,
    )
    let b = Math.round(
      (1 - Math.sqrt((x - bx) ** 2 + (y - by) ** 2) / b_max_d) * 255,
    )

    let code = (r << 16) | (g << 8) | (b << 0)

    let j = input
      .map((code, i) => {
        let d2 =
          ((r - (code >> 16)) & 255) ** 2 +
          ((g - (code >> 8)) & 255) ** 2 +
          ((b - (code >> 0)) & 255) ** 2
        return [d2, i]
      })
      .sort((a, b) => a[0] - b[0])[0][1]

    palette[i] = code

    palette[i] = input[j]
    input.splice(j, 1)
  })
}

sample()
// even()
