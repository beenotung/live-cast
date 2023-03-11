import robot from 'robotjs'
import jpeg from 'jpeg-js'
import fs from 'fs'

export type Palette = number[]
export type PaletteTable = {
  [code: number]: [r: number, g: number, b: number, index: number]
}

export function getPalette(
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

export function applyPalette(
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

export function initPaletteKMean(
  palette: Palette,
  image: Buffer,
  speedup = 100,
): void {
  let n = image.length

  initEvenPalette(palette)

  let groups = palette.map(code => {
    let b = (code >> 16) & 255
    let g = (code >> 8) & 255
    let r = (code >> 0) & 255
    return { r, g, b, count: 0 }
  })

  for (let offset = 0; offset < n; offset += 4 * speedup) {
    process.stdout.write(
      `\r createPaletteKMean ${((offset / n) * 100).toFixed(2)}%`,
    )
    let b = image[offset + 0]
    let g = image[offset + 1]
    let r = image[offset + 2]

    let group = groups
      .map((group, i) => {
        let dr = r - group.r
        let dg = g - group.g
        let db = b - group.b

        let d2 = dr * dr + dg * dg + db * db

        return [group, d2] as const
      })
      .sort((a, b) => a[1] - b[1])[0][0]

    let oldCount = group.count
    let newCount = oldCount + 1
    group.r = (group.r * oldCount + r) / newCount
    group.g = (group.g * oldCount + g) / newCount
    group.b = (group.b * oldCount + b) / newCount
    group.count = newCount
  }
  process.stdout.write(`\r                           \r`)

  groups.forEach(
    (group, i) =>
      (palette[i] = (group.r << 16) | (group.g << 8) | (group.b << 0)),
  )
}

export function createEmptyPalette(size: number): Palette {
  return Array(size)
}

function initEvenPalette(palette: Palette): void {
  let i = 0

  function addCode(code: number) {
    if (i >= palette.length) return

    if (palette.includes(code)) return

    palette[i] = code
    i++
  }

  function toCode(r: number, g: number, b: number) {
    return (r << 16) | (g << 8) | (b << 0)
  }

  function expandFixed(lo: number, hi: number) {
    let codes = [
      toCode(lo, lo, lo),
      toCode(hi, lo, lo),
      toCode(lo, hi, lo),
      toCode(lo, lo, hi),
      toCode(lo, hi, hi),
      toCode(hi, lo, hi),
      toCode(hi, hi, lo),
      toCode(hi, hi, hi),
    ]
    return codes
  }

  let step = 256
  while (i < palette.length) {
    let codes = expandFixed(0, step - 1)
    let lo = step - 1
    while (lo + step < 256) {
      codes.push(...expandFixed(lo, lo + step))
      lo += step
    }
    codes.sort(() => Math.random() - 0.5)
    codes.forEach(code => addCode(code))
    step /= 2
  }
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

function even() {
  let palette = createEmptyPalette(256)
  initEvenPalette(palette)

  console.time('savePalette')
  savePalette(palette)
  console.timeEnd('savePalette')
}

// sample()
// even()
