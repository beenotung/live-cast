let acc = 0
let alpha = 0.5
let beta = 1 - alpha

let lastTime = 0

export function startFPS() {
  lastTime = Date.now()
}

export function getFPS() {
  let now = Date.now()
  let time = now - lastTime
  let fps = 1000 / time

  lastTime = now

  acc = acc * alpha + fps * beta

  let rate = acc.toFixed(0)

  return rate
}
