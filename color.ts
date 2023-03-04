export function encodeColor(r: number, g: number, b: number): number {
  r = Math.round((r * 7) / 255)
  g = Math.round((g * 7) / 255)
  b = Math.round((b * 3) / 255)
  return (r << 5) | (g << 2) | (b << 0)
}

export function decodeColor(
  code: number,
  colors: Uint8ClampedArray,
  offset: number,
) {
  let r = Math.round((((code >> 5) & 7) * 255) / 7)
  let g = Math.round((((code >> 2) & 7) * 255) / 7)
  let b = Math.round((((code >> 0) & 3) * 255) / 3)
  colors[offset + 0] = r
  colors[offset + 1] = g
  colors[offset + 2] = b
}

function test() {
  let last = ''

  function test(r: number, g: number, b: number) {
    let code = encodeColor(r, g, b)
    let colors = [] as any
    decodeColor(code, colors, 0)
    let now = colors.join()
    if (now != last) {
      console.log({ r, g, b, code, colors })
      last = now
    }
  }

  for (let r = 0; r < 256; r += 8) {
    for (let g = 0; g < 256; g += 8) {
      for (let b = 0; b < 256; b += 4) {
        test(r, g, b)
      }
    }
  }
}

test()
