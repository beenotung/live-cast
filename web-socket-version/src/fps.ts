export function createFPSCounter() {
  let startTime = Date.now()
  let count = 0

  function tick(): void {
    count++
  }

  return {
    tick,
    getFPS: () => {
      let now = Date.now()
      let timePassed = (now - startTime) / 1000
      return count / timePassed
    },
    reset: () => {
      startTime = Date.now()
      count = 0
    },
  }
}
