export function createFPSCounter() {
  let lastTime = 0
  let lastFPS = 0

  let alpha = 0.9
  let beta = 1 - alpha

  function tick(): void {
    let now = Date.now()
    if (!lastTime) {
      lastTime = now
      return
    }

    let timePassed = now - lastTime || 1
    lastTime = now
    let fps = 1000 / timePassed

    if (!lastFPS) {
      lastFPS = fps
      return
    }

    lastFPS = alpha * lastFPS + beta * fps
  }

  return {
    tick,
    getFPS: () => lastFPS,
    reset: () => {
      lastTime = 0
      lastFPS = 0
    },
  }
}
