// using imagemagick
import { exec, execSync } from 'child_process'
import { max_size } from './config'

let w = 1920
let h = 1080

function full() {
  let commandOptions = {
    encoding: 'buffer',
    maxBuffer: 2073600 / 2, // 2M (1920 x 1080)
  } as const
  let commandLine = `import -silent -window root -screen jpg:-`
  return execSync(commandLine, commandOptions)
}

function create(partId: number, crop: string) {
  let q = 50
  let commandLine = `import -silent -window root -crop ${crop} -quality ${q} -screen jpg:-`
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
          q += 5
          console.log('+', { partId, q, remind })
          commandLine = `import -silent -window root -crop ${crop} -quality ${q} -screen jpg:-`
        }
        buffer[0] = partId
        return buffer
      } catch (error) {
        if (q > min_q) {
          q -= dec_q_step
          console.log('-', { partId, q })
          commandLine = `import -silent -window root -crop ${crop} -quality ${q} -screen jpg:-`
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

// export let parts = {
//   0: [0, 0],
//   1: [960, 0],
//   2: [0, 540],
//   3: [960, 540],
//   w: 960,
//   h: 540,
// }

// export let capture0 = create(0, '960x540+0+0')
// export let capture1 = create(1, '960x540+960+0')
// export let capture2 = create(2, '960x540+0+540')
// export let capture3 = create(3, '960x540+960+540')

// export let captures = [capture0, capture1, capture2, capture3]

namespace profile1 {
  export let parts = {
    0: [0, 0],
    w: w,
    h: h,
  }
  export let capture0 = create(0, `${w}x${h}+0+0`)
  export let captures = [capture0]

  export let min_q = 2
  export let dec_q_step = 1
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
  export let captures: Capture[] = []

  for (let i of [0, 1] as const) {
    captures.push(create(i, `${pw}x${ph}+${parts[i][0]}+${parts[i][1]}`))
  }

  export let min_q = 20
  export let dec_q_step = 5
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
  export let captures: Capture[] = []

  for (let i of [0, 1, 2] as const) {
    captures.push(create(i, `${pw}x${ph}+${parts[i][0]}+${parts[i][1]}`))
  }

  export let min_q = 20
  export let dec_q_step = 10
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
  export let captures: Capture[] = []

  for (let i of [0, 1, 2, 3] as const) {
    captures.push(create(i, `${pw}x${ph}+${parts[i][0]}+${parts[i][1]}`))
  }

  export let min_q = 20
  export let dec_q_step = 10
}

export let { parts, captures, min_q, dec_q_step } = profile1

export let partsCount = captures.length
