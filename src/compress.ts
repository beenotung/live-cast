import robot from 'robotjs'
import zlib from 'zlib'
import {
  applyPalette,
  createPaletteKMean,
  getPalette,
  PaletteTable,
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
  let palette = createPaletteKMean(image)
  console.timeEnd('prepare color palette')

  let codes = Buffer.alloc(w * h)
  console.time('apply color palette')
  let paletteTable: PaletteTable = new Array(256)
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

  for (let level = 1; level <= 9; level++) {
    console.time('compress level ' + level)
    let out = zlib.gzipSync(codes, { level })
    console.timeEnd('compress level ' + level)
    console.log('size', out.length.toLocaleString())
  }
}

// test()
