import robot from 'robotjs'
import jpeg from 'jpeg-js'
import fs from 'fs'

let counts = new Array(256 ** 3)

function createPaletteFromImage(image: Buffer) {
  let palette: number[] = []

  let n = image.length

  counts.fill(0)

  let speedup = 1
  for (let i = 0; i < n; i += 4 * speedup) {
    let b = image[i + 0]
    let g = image[i + 1]
    let r = image[i + 2]

    let code = (r << 16) | (g << 8) | (b << 0)
    counts[code]++
  }

  console.time('sort colors')
  let sorted = Object.entries(counts)
    .filter(c => c[1] > 0)
    .sort((a, b) => b[1] - a[1])
  for (let i = 0; i < 256; i++) {
    palette[i] = +sorted[i][0]
  }
  console.timeEnd('sort colors')

  palette.sort((a, b) => b - a)

  return palette
}

type Palette = number[]
type PaletteTable = {
  [code: number]: [r: number, g: number, b: number, index: number]
}

function getPalette(
  r: number,
  g: number,
  b: number,
  palette: Palette,
  paletteTable: PaletteTable,
) {
  let code = (r << 16) + (g << 8) + (b << 0)

  let match = paletteTable[code]
  if (!match) {
    let [d2, pi, pr, pg, pb] = palette
      .map((code, i) => {
        let pr = (code >> 16) & 255
        let pg = (code >> 8) & 255
        let pb = (code >> 0) & 255
        let dr = r - pr
        let dg = g - pg
        let db = b - pb
        let d2 = dr * dr + dg * dg + db * db
        return [d2, i, pr, pg, pb]
      })
      .sort((a, b) => a[0] - b[0])[0]
    match = [pr, pg, pb, pi]
    paletteTable[code] = match
  }

  return match
}

function applyPalette(
  image: Buffer,
  palette: Palette,
  paletteTable: PaletteTable,
) {
  let n = image.length
  for (let i = 0; i < n; i += 4) {
    let b = image[i + 0]
    let g = image[i + 1]
    let r = image[i + 2]

    ;[r, g, b] = getPalette(r, g, b, palette, paletteTable)

    image[i + 0] = b
    image[i + 1] = g
    image[i + 2] = r
  }
}

function savePalette(palette: number[]) {
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

function saveCapture(capture: robot.Bitmap, file: string) {
  console.time('save ' + file)

  let output = [0]

  let image = capture.image

  let n = image.length
  for (let i = 0; i < n; i += 4) {
    let b = image[i + 0]
    let g = image[i + 1]
    let r = image[i + 2]
    output[i + 0] = r
    output[i + 1] = g
    output[i + 2] = b
    output[i + 3] = 255
  }

  let out = jpeg.encode({
    width: capture.width,
    height: capture.height,
    data: output,
  })

  fs.writeFileSync(file, out.data)

  console.timeEnd('save ' + file)
}

function sample() {
  console.time('capture')
  let capture = robot.screen.capture()
  console.timeEnd('capture')

  saveCapture(capture, 'original.jpg')

  let palette = createEvenPalette()

  // console.time('createPaletteFromImageExpensive')
  // let palette = createPaletteFromImage(capture.image)
  // console.timeEnd('createPaletteFromImageExpensive')

  // console.time('createSamplePalette')
  // let palette = createSamplePalette(capture.image)
  // console.timeEnd('createSamplePalette')

  console.time('savePalette')
  savePalette(palette)
  console.timeEnd('savePalette')

  let paletteTable: PaletteTable = new Array(256)

  console.time('applyPalette')
  applyPalette(capture.image, palette, paletteTable)
  console.timeEnd('applyPalette')

  saveCapture(capture, 'compressed.jpg')
}

function createSamplePalette(image: Buffer) {
  let palette: number[] = []

  function addColor(r: number, g: number, b: number) {
    let code = (r << 16) | (g << 8) | (b << 0)
    palette.push(code)
  }
  addColor(0, 0, 0)
  addColor(255, 0, 0)
  addColor(0, 255, 0)
  addColor(0, 0, 255)
  addColor(0, 255, 255)
  addColor(255, 0, 255)
  addColor(255, 255, 0)
  addColor(255, 255, 255)

  let n = image.length / 4
  for (let i = palette.length; i < 256; i++) {
    let offset = Math.floor(Math.random() * n)
    let b = image[offset + 0]
    let g = image[offset + 1]
    let r = image[offset + 2]
    addColor(r, g, b)
  }
  palette.sort((a, b) => b - a)

  return palette
}

function createEvenPalette() {
  let palette: number[] = []

  function addColor(r: number, g: number, b: number) {
    let code = (r << 16) | (g << 8) | (b << 0)
    palette.push(code)
  }
  addColor(0, 0, 0)
  addColor(255, 0, 0)
  addColor(0, 255, 0)
  addColor(0, 0, 255)
  addColor(0, 255, 255)
  addColor(255, 0, 255)
  addColor(255, 255, 0)
  addColor(255, 255, 255)

  for (let i = palette.length; i < 256; i++) {
    let r = Math.floor(Math.random() * 256)
    let g = Math.floor(Math.random() * 256)
    let b = Math.floor(Math.random() * 256)
    addColor(r, g, b)
  }
  palette.sort((a, b) => b - a)

  return palette
}

function even() {
  let palette = createEvenPalette()

  console.time('savePalette')
  savePalette(palette)
  console.timeEnd('savePalette')
}

sample()
// even()
