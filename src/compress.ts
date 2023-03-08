import { writeFileSync } from 'fs'
import jpeg from 'jpeg-js'
import robot from 'robotjs'
import zlib from 'zlib'
import {
  applyPalette,
  initPaletteKMean,
  getPalette,
  PaletteTable,
  createEmptyPalette,
} from './palette'
import { h, offset, w } from './screenshot'

export function createCompress(max_size: number) {
  let level = 3
  function compress(data: Buffer) {
    for (;;) {
      try {
        let result = zlib.gzipSync(data, { level, maxOutputLength: max_size })
        if (result.length - max_size > 2000) {
          level--
          console.log('reduce compress level to', level)
        }
        return result
      } catch (error) {
        // size excess
        if (level >= 9) {
          throw error
        }
        console.log('increase compress level to', level)
        level++
      }
    }
  }
  return compress
}

function test() {
  let raw = robot.screen.capture(offset[0], offset[1], w, h)
  // console.log(raw)

  let image = raw.image as Buffer
  console.log('raw', image.length.toLocaleString())

  let rgb = Buffer.alloc(w * h * 3)
  let rawI = 0
  let outI = 0
  for (; outI < rgb.length; ) {
    rgb[outI + 0] = image[rawI + 0]
    rgb[outI + 1] = image[rawI + 1]
    rgb[outI + 2] = image[rawI + 2]
    rawI += 4
    outI += 3
  }

  console.log('rgb', rgb.length.toLocaleString())

  // takes 41ms
  console.time('compress')
  let compressed = zlib.gzipSync(rgb)
  console.timeEnd('compress')
  console.log('compressed', compressed.length.toLocaleString())

  console.time('prepare color palette')
  let palette = createEmptyPalette(2) // preserve a slot of skip frame
  initPaletteKMean(palette, image, 100)
  console.timeEnd('prepare color palette')

  let codes = Buffer.alloc(w * h)
  console.time('apply color palette')
  let paletteTable: PaletteTable = new Array(palette.length)
  let n = image.length
  for (let i = 0; i < n; i += 4) {
    let b = image[i + 0]
    let g = image[i + 1]
    let r = image[i + 2]

    let code = getPalette(r, g, b, palette, paletteTable)[3]
    codes[i / 4] = code
  }
  console.timeEnd('apply color palette')
  console.log('codes', codes.length.toLocaleString())

  // takes 16ms
  console.time('compress')
  compressed = zlib.gzipSync(codes)
  console.timeEnd('compress')
  console.log('compressed', compressed.length.toLocaleString())

  // for (let level = 1; level <= 9; level++) {
  //   console.time('compress level ' + level)
  //   let out = zlib.gzipSync(codes, { level })
  //   console.timeEnd('compress level ' + level)
  //   console.log('size', out.length.toLocaleString())
  // }

  function saveImage(file: string) {
    let rawImage = Buffer.alloc(w * h * 4)
    let c = 0
    for (let i = 0; i < w * h * 4; i += 4, c++) {
      let code = palette[codes[c]]
      let r = (code >> 16) & 255
      let g = (code >> 8) & 255
      let b = (code >> 0) & 255
      rawImage[i + 0] = r
      rawImage[i + 1] = g
      rawImage[i + 2] = b
      rawImage[i + 3] = 255
    }
    let jpegImage = jpeg.encode({ width: w, height: h, data: rawImage })
    writeFileSync(file, jpegImage.data)
  }

  saveImage('distort-before.jpeg')

  console.log(codes)
  function blur() {
    let distort = 0
    for (; compressed.length > 65506; ) {
      let radius = Math.ceil(Math.sqrt(compressed.length - 65506))
      let batch = 1
      for (let b = 0; b < batch; b++) {
        distort++
        let cx = Math.floor(Math.random() * w - radius * 2 + radius)
        let cy = Math.floor(Math.random() * h - radius * 2 + radius)
        let counts: number[] = []
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            let x = cx + dx
            let y = cy + dy
            let i = y * w + x
            let c = codes[i]
            counts[c] = (counts[c] || 0) + 1
          }
        }
        let mode = +Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        for (let dy = -radius; dy < radius; dy++) {
          for (let dx = -radius; dx < radius; dx++) {
            let x = cx + dx
            let y = cy + dy
            let i = y * w + x
            codes[i] = mode
          }
        }
      }
      compressed = zlib.gzipSync(codes)
      process.stdout.write(
        `\r ${distort.toLocaleString()} distort | size ${compressed.length.toLocaleString()} `,
      )
    }
    console.log()
  }
  function skip() {
    let skip = 0
    let min_radius = 100
    for (; compressed.length > 65506; ) {
      let radius = Math.ceil(Math.sqrt(compressed.length - 65506))
      if (radius < min_radius) {
        radius = min_radius
      }
      let batch = 1
      for (let b = 0; b < batch; b++) {
        skip++
        let cx = Math.floor(Math.random() * w - radius * 2 + radius)
        let cy = Math.floor(Math.random() * h - radius * 2 + radius)
        for (let dy = -radius; dy < radius; dy++) {
          for (let dx = -radius; dx < radius; dx++) {
            let x = cx + dx
            let y = cy + dy
            let i = y * w + x

            codes[i] = palette.length
          }
        }
      }
      compressed = zlib.gzipSync(codes)
      process.stdout.write(
        `\r skip ${skip.toLocaleString()} | size ${compressed.length.toLocaleString()} `,
      )
    }
    console.log()
  }
  skip()

  saveImage('distort-after.jpeg')
}

test()
