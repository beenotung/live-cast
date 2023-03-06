import child_process from 'child_process'
import { h, offset, w } from './screenshot'

let recorderProcess = child_process.spawn(
  `ffmpeg`,
  [
    '-video_size',
    `${w}x${h}`,
    '-framerate',
    '1',
    '-f',
    'x11grab',
    '-i',
    `:0.0+${offset[0]},${offset[1]}`,
    '-rtbufsize',
    '100M',
    '-probesize',
    '10M',
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-tune',
    'zerolatency',
    '-pix_fmt',
    'yuv420p',
    '-f',
    'flv',
    '-',
  ],
  {
    stdio: 'pipe',
  },
)

let playerProcess = child_process.spawn('ffplay', ['-'], { stdio: 'pipe' })

recorderProcess.stdout.on('data', (data: Buffer) => {
  console.log(data.length.toLocaleString(), 'bytes')
  playerProcess.stdin.write(data)
})

recorderProcess.stderr.on('data', (data: Buffer) => {
  console.log(data.toString())
})
playerProcess.stderr.on('data', (data: Buffer) => {
  console.log(data.toString())
})
