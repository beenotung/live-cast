import robot from 'robotjs'
import jpeg from 'jpeg-js'
import { captureFullScreen, h, w } from './screenshot'

function test() {
  let start = Date.now()
  let raw = robot.screen.capture()
  let r = Date.now() - start
  jpeg.encode({
    width: raw.width,
    height: raw.height,
    data: raw.image,
  })
  let r_en = Date.now() - start

  start = Date.now()
  let buffer = captureFullScreen(50)
  jpeg.decode(buffer)
  let f = Date.now() - start

  console.log({ r, r_en, f })
  setImmediate(test)
}

test()
