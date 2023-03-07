// using imagemagick
import { exec, execSync } from 'child_process'
import { max_size } from './config'

export let offset = [0, 0]
// export let offset = [1680, 0]
// let offset = [640, 1178]

export let [w, h] = [1920, 1080] // 5 fps
// export let [w, h] = [1600, 900] // 6 fps
// export let [w, h] = [1280, 720] // 10 fps
// export let [w, h] = [1024, 576] // 12 fps
// export let [w, h] = [960, 540] // 16 fps
// export let [w, h] = [720, 405] // 22 fps
// export let [w, h] = [640, 360] // 30 fps

function full() {
  let commandOptions = {
    encoding: 'buffer',
    maxBuffer: w * h, // 2M (1920 x 1080)
  } as const
  let commandLine = `import -silent -window root -screen jpg:-`
  return execSync(commandLine, commandOptions)
}

function makeCrop(w: number, h: number, [x, y]: number[]) {
  x += offset[0]
  y += offset[1]
  return `${w}x${h}+${x}+${y}`
}

export function captureFullScreen(q = 50) {
  let crop = makeCrop(w, h, [0, 0])
  let commandLine = `import -silent -window root -crop ${crop} -quality ${q} -screen jpg:-`
  let commandOptions = {
    encoding: 'buffer',
    maxBuffer: w * h, // 2M (1920 x 1080)
  } as const
  return execSync(commandLine, commandOptions)
}

function create(init_q: number, partId: number, crop: string) {
  let q = 1 - 100
  let commandLine = ``
  function setQ(value: number) {
    q = value
    commandLine = `import -silent -window root -crop ${crop} -quality ${q} -screen jpg:-`
  }
  setQ(init_q)
  let commandOptions = {
    encoding: 'buffer',
    maxBuffer: max_size,
  } as const
  function capture() {
    for (;;) {
      try {
        let buffer = execSync(commandLine, commandOptions)
        let remind = max_size - buffer.length
        if (remind > 10000 && q < 80) {
          setQ(q + 5)
          console.log('+', { partId, crop, q, remind })
        }
        buffer[0] = partId
        return buffer
      } catch (error) {
        if (q > min_q) {
          setQ(q - dec_q_step)
          console.log('-', { partId, crop, q })
        } else {
          console.log('screen content too complex', {
            partId,
            error,
            commandLine,
          })
        }
      }
    }
  }
  return capture
}

export type Capture = ReturnType<typeof create>

namespace profile1 {
  export let parts = {
    0: [0, 0],
    w: w,
    h: h,
  }

  export let init_q = 20
  export let min_q = 2
  export let dec_q_step = 1

  export let capture0 = create(init_q, 0, makeCrop(w, h, parts[0]))

  export let captures = [capture0]
}

namespace profile2 {
  let pw = w / 2
  let ph = h

  export let parts = {
    0: [0, 0],
    1: [pw, 0],
    w: pw,
    h: ph,
  }

  export let init_q = 50
  export let min_q = 20
  export let dec_q_step = 5

  export let captures: Capture[] = []

  for (let i of [0, 1] as const) {
    captures.push(create(init_q, i, makeCrop(pw, ph, parts[i])))
  }
}

namespace profile3 {
  let pw = w / 3
  let ph = h

  export let parts = {
    0: [0, 0],
    1: [pw, 0],
    2: [pw * 2, 0],
    w: pw,
    h: ph,
  }

  export let init_q = 50
  export let min_q = 20
  export let dec_q_step = 10

  export let captures: Capture[] = []

  for (let i of [0, 1, 2] as const) {
    captures.push(create(init_q, i, makeCrop(pw, ph, parts[i])))
  }
}

namespace profile4 {
  let pw = w / 2
  let ph = h / 2

  export let parts = {
    0: [0, 0],
    1: [pw, 0],
    2: [0, ph],
    3: [pw, ph],
    w: pw,
    h: ph,
  }

  export let init_q = 50
  export let min_q = 20
  export let dec_q_step = 10

  export let captures: Capture[] = []

  for (let i of [0, 1, 2, 3] as const) {
    captures.push(create(init_q, i, makeCrop(pw, ph, parts[i])))
  }
}

export let { parts, captures, min_q, dec_q_step } = profile1

export let partsCount = captures.length
