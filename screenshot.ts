import { execSync } from 'child_process'

// using imagemagick
let commandLine = `import -silent -window root jpg:"-" `

let commandOptions = {
  encoding: 'buffer',
  maxBuffer: 2073600, // 2M (1920 x 1080)
} as const

export function screenshot(): Buffer {
  return execSync(commandLine, commandOptions)
}
