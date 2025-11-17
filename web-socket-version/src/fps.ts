export function createFPSCounter() {
  let startTime = performance.now()
  let count = 0

  function tick(): void {
    count++
  }

  return {
    tick,
    getFPS: () => {
      let now = performance.now()
      let timePassed = (now - startTime) / 1000
      return count / timePassed
    },
    reset: () => {
      startTime = performance.now()
      count = 0
    },
  }
}
