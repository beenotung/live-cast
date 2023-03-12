import jpeg from 'jpeg-js'
import type robot from 'robotjs'
import fs from 'fs'

export function saveCapture(capture: robot.Bitmap, file: string) {
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
