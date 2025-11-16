import { env } from './env'

export let serverPort = 8456
export let clientPort = 8457

export let max_size = 65507

export let offset = [0, 0]
// export let offset = [1680, 0] // right-side screen
// export let offset = [253, 1211] // bottom screen

offset = env.OFFSET.split(',').map(part => +part)
offset[0] ||= 0
offset[1] ||= 0

export let [w, h] = [1920, 1080]

export let paletteSize = 16
