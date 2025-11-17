export let shareMessage = 1
export let subscribeMessage = 2
export let screenMessage = 3
export let unsubscribeMessage = 4
export let stopSharingMessage = 5
export let idMessage = 6
export let receivedMessage = 7

export async function makeScreenMessage(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  quality: number,
) {
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
  let blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(
      blob => {
        resolve(blob)
      },
      'image/jpeg',
      quality,
    )
  })
  if (!blob) {
    throw new Error('failed to convert canvas to blob')
  }
  let imageData = await blob.bytes()

  let message = new Uint8Array(3 + imageData.length)

  // message type
  message[0] = screenMessage

  // image data width
  let width = canvas.width
  let widthLow = width & 255
  let widthHigh = (width >> 8) & 255
  message[1] = widthLow
  message[2] = widthHigh

  // image data payload
  message.set(imageData, 3)

  return message
}

export async function parseScreenMessage(message: Uint8Array) {
  let widthLow = message[1]
  let widthHigh = message[2]
  let width = (widthHigh << 8) | widthLow
  let jpegBytes = new Uint8Array(message.subarray(3))
  let blob = new Blob([jpegBytes], { type: 'image/jpeg' })
  let image = document.createElement('img')
  let url = URL.createObjectURL(blob)
  await new Promise<void>(resolve => {
    image.onload = () => resolve()
    image.src = url
  })
  URL.revokeObjectURL(url)
  return image
}

export function makeIdMessage(id: number) {
  let message = new Uint8Array(2)
  message[0] = idMessage
  message[1] = id
  return message
}

export function parseIdMessage(message: Uint8Array) {
  return message[1]
}

export function makeReceivedMessage(id: number, fps: number) {
  fps = Math.round(fps * 1000) // keep 3 decimal places
  let fpsLow = fps & 255
  let fpsHigh = (fps >> 8) & 255

  let message = new Uint8Array(4)
  message[0] = receivedMessage
  message[1] = id
  message[2] = fpsLow
  message[3] = fpsHigh
  return message
}

export function parseReceivedMessage(message: Uint8Array) {
  let id = message[1]

  let fpsLow = message[2]
  let fpsHigh = message[3]
  let fps = (fpsHigh << 8) | fpsLow
  fps /= 1000 // restore 3 decimal places

  return { id, fps }
}
