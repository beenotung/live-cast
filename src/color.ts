export const R = 0
export const G = 1
export const B = 2
export const Y = 3
export const Cb = 4
export const Cr = 5

export type ColorArray = [
  r: number,
  g: number,
  b: number,
  Y: number,
  Cb: number,
  Cr: number,
]
export type ColorObject = {
  [R]: number
  [G]: number
  [B]: number
  [Y]: number
  [Cb]: number
  [Cr]: number
}

// reference: https://en.wikipedia.org/wiki/YCbCr

export function rgbToYCbCr(color: ColorArray | ColorObject) {
  const [r, g, b] = color as ColorArray
  color[Y] = 0 + 0.299 * r + 0.587 * g + 0.114 * b
  color[Cb] = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b
  color[Cr] = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b
}

export function rgbFromYCbCr(color: ColorArray | ColorObject) {
  const [_r, _g, _b, Y, Cb, Cr] = color as ColorArray
  color[R] = checkRGBRange(Y + 1.402 * (Cr - 128))
  color[G] = checkRGBRange(Y - 0.344136 * (Cb - 128) - 0.714136 * (Cr - 128))
  color[B] = checkRGBRange(Y + 1.772 * (Cb - 128))
}

export function checkRGBRange(x: number) {
  if (x < 0) return 0
  if (x > 255) return 255
  return Math.round(x)
}
