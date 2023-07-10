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
  checkRGBRange,
} from './color'

type code = number

export type Palette = code[]

export type PaletteTableItem = [color: ColorArray, index: number]
export const Index = 1

// code -> PaletteTableItem
export type PaletteTable = Array<PaletteTableItem | null>

export function getPalette(
  r: number,
  g: number,
  b: number,
  palette: Palette,
  paletteTable: PaletteTable,
) {
  let code = (r << 16) | (g << 8) | (b << 0)

  let match = paletteTable[code]
  if (!match) {
    let color: ColorArray = [r, g, b, 0, 0, 0]
    rgbToYCbCr(color)
    match = palette
      .map((code, i): [d2: number, item: PaletteTableItem] => {
        let pr = (code >> 16) & 255
        let pg = (code >> 8) & 255
        let pb = (code >> 0) & 255
        let pColor: ColorArray = [pr, pg, pb, 0, 0, 0]
        rgbToYCbCr(pColor)
        let item: PaletteTableItem = [pColor, i]
        let dY = color[Y] - pColor[Y]
        let dCb = color[Cb] - pColor[Cb]
        let dCr = color[Cr] - pColor[Cr]
        let d2 = dY * dY + dCb * dCb + dCr * dCr
        return [d2, item]
      })
      .sort((a, b) => a[0] - b[0])[0][1]
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

    let color = getPalette(r, g, b, palette, paletteTable)[0]

    image[i + 0] = color[B]
    image[i + 1] = color[G]
    image[i + 2] = color[R]
  }
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
    let color: ColorArray = [r, g, b, 0, 0, 0]
    rgbToYCbCr(color)
    return { color, count: 0 }
  })

  for (let offset = 0; offset < n; offset += 4 * speedup) {
    process.stdout.write(
      `\r createPaletteKMean ${((offset / n) * 100).toFixed(2)}%`,
    )
    let b = image[offset + 0]
    let g = image[offset + 1]
    let r = image[offset + 2]
    let color: ColorArray = [r, g, b, 0, 0, 0]
    rgbToYCbCr(color)

    let group = groups
      .map((group, i) => {
        let dY = color[Y] - group.color[Y]
        let dCb = color[Cb] - group.color[Cb]
        let dCr = color[Cr] - group.color[Cr]

        let d2 = dY * dY + dCb * dCb + dCr * dCr

        return [group, d2] as const
      })
      .sort((a, b) => a[1] - b[1])[0][0]

    let oldCount = group.count
    let newCount = oldCount + 1
    for (let i = 0; i < 6; i++) {
      group.color[i] = (group.color[i] * oldCount + color[i]) / newCount
    }
    group.count = newCount
  }
  process.stdout.write(`\r                           \r`)

  groups.forEach((group, i) => {
    let r = checkRGBRange(group.color[R])
    let g = checkRGBRange(group.color[G])
    let b = checkRGBRange(group.color[B])
    palette[i] = (r << 16) | (g << 8) | (b << 0)
  })
}

export function createEmptyPalette(size: number): Palette {
  return Array(size)
}

export function initEvenPalette(palette: Palette): void {
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
  // function toCode(Y: number, Cb: number, Cr: number) {
  //   let color: ColorArray = [0, 0, 0, Y, Cb, Cr]
  //   rgbFromYCbCr(color)
  //   let [r, g, b] = color
  //   return (r << 16) | (g << 8) | (b << 0)
  // }

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
