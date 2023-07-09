import { ColorArray, rgbFromYCbCr, rgbToYCbCr } from './color'

let step = 1
let color: ColorArray = { r: 0, g: 0, b: 0, Y: 0, Cb: 0, Cr: 0 }
let d2Counts: Record<number, number> = {}
for (let r = 0; r <= 255; r += step) {
  for (let g = 0; g <= 255; g += step) {
    for (let b = 0; b <= 255; b += step) {
      color.r = r
      color.g = g
      color.b = b
      rgbToYCbCr(color)
      rgbFromYCbCr(color)
      let dr = r - color.r
      let dg = g - color.g
      let db = b - color.b
      let d2 = dr * dr + dg * dg + db * db
      let count = d2Counts[d2] || 0
      d2Counts[d2] = count + 1
    }
  }
}
console.log(d2Counts)
