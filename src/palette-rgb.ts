export type Palette = number[]
export type PaletteTableItem = [r: number, g: number, b: number, index: number]
// code -> [r,g,b,index]
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
    match = palette
      .map((code, i): [d2: number, item: PaletteTableItem] => {
        let pr = (code >> 16) & 255
        let pg = (code >> 8) & 255
        let pb = (code >> 0) & 255
        let dr = r - pr
        let dg = g - pg
        let db = b - pb
        let d2 = dr * dr + dg * dg + db * db
        let item: PaletteTableItem = [pr, pg, pb, i]
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

    ;[r, g, b] = getPalette(r, g, b, palette, paletteTable)

    image[i + 0] = b
    image[i + 1] = g
    image[i + 2] = r
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

  groups.forEach((group, i) => {
    palette[i] = (group.r << 16) | (group.g << 8) | (group.b << 0)
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
