export let shareMessage = 1
export let subscribeMessage = 2
export let screenMessage = 3
export let unsubscribeMessage = 4
export let stopSharingMessage = 5

export function makeScreenMessage(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
) {
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
  let imageData = context.getImageData(
    0,
    0,
    video.videoWidth,
    video.videoHeight,
  )

  let message = new Uint8Array(3 + imageData.data.length)

  // message type
  message[0] = screenMessage

  // image data width
  let width = canvas.width
  let widthLow = width & 255
  let widthHigh = (width >> 8) & 255
  message[1] = widthLow
  message[2] = widthHigh

  // image data payload
  message.set(imageData.data, 3)

  return message
}

export function parseScreenMessage(message: Uint8Array) {
  let widthLow = message[1]
  let widthHigh = message[2]
  let width = (widthHigh << 8) | widthLow
  let imageData = new ImageData(
    new Uint8ClampedArray(message.subarray(3)),
    width,
  )
  return imageData
}
