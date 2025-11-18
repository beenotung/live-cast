import { max, median, min } from '@beenotung/tslib/array'
import { createFPSCounter } from './fps'
import {
  idMessage,
  makeReceivedMessage,
  makeScreenMessage,
  parseIdMessage,
  parseReceivedMessage,
  parseScreenMessage,
  receivedMessage,
  screenMessage,
  shareMessage,
  stopSharingMessage,
  subscribeMessage,
  unsubscribeMessage,
} from './message'
import { Position } from './env'

let statusNode = querySelector('#status')
let shareButton = querySelector('#shareButton')
let subscribeButton = querySelector('#subscribeButton')
let receiverFPSText = querySelector('#receiverFPS')

let watermarkImage = new Image()
let watermarkPosition: Position | null = null

let remoteVideo = document.createElement('video')
let remoteCanvas = document.createElement('canvas')
let remoteContext = remoteCanvas.getContext('2d')!

let wsOrigin = location.origin.replace('http', 'ws')
let wsUrl = wsOrigin + '/ws'
let socket = connect()

let senderFPSCounter = createFPSCounter()
let receiverFPSCounter = createFPSCounter()
let receiverId = 0

let receiverFPSList: number[] = []

let targetFPS = 30

let limitFPS = false

let stopByError = false

function adjustSenderFPS() {
  let fpsList = Object.values(receiverFPSList)
  let medianFPS = median(fpsList)
  if (!medianFPS) {
    return
  }
  let senderFPS = senderFPSCounter.getFPS()
  let ratio = medianFPS / senderFPS
  if (ratio < 0.9) {
    // receiver getting < 90% of sent frames, reduce sender FPS significantly
    targetFPS = senderFPS * 0.9
  } else if (ratio >= 0.95) {
    // receiver getting > 95% of sent frames, increase sender FPS slightly
    targetFPS = senderFPS + 2
  }
  let message = `count: ${fpsList.length}`
  message += ` | min: ${min(fpsList)!.toFixed(1)}`
  message += ` | max: ${max(fpsList)!.toFixed(1)}`
  message += ` | median: ${medianFPS.toFixed(1)}`
  message += ` | ratio: ${ratio.toFixed(2)}`
  if (limitFPS) {
    message += ` | target: ${targetFPS.toFixed(1)}`
  }
  receiverFPSText.textContent = message
}

function connect() {
  let socket = new WebSocket(wsUrl)
  socket.onopen = () => {
    statusNode.textContent = 'Connected to server'
    if (remoteVideo.srcObject) {
      send(new Uint8Array([subscribeMessage]), 'wait')
    }
  }
  socket.onmessage = async event => {
    try {
      let blob = event.data as Blob
      let message = new Uint8Array(await blob.bytes())
      switch (message[0]) {
        case screenMessage:
          if (receiverId) {
            receiverFPSCounter.tick()
            let fps = receiverFPSCounter.getFPS()
            receiverFPSText.textContent = fps.toFixed(1)
            if (receivedMessage) {
              send(makeReceivedMessage(receiverId, fps))
            }
          }
          let image = await parseScreenMessage(message)
          remoteCanvas.width = image.width
          remoteCanvas.height = image.height
          remoteContext.drawImage(image, 0, 0)
          break
        case idMessage:
          receiverId = parseIdMessage(message)
          break
        case receivedMessage:
          receiverFPSCounter.tick()
          let { id, fps } = parseReceivedMessage(message)
          receiverFPSList[id] = fps
          adjustSenderFPS()
          break
        default:
          console.error('received unknown message:', message)
      }
    } catch (error) {
      console.error('failed to process message:', error)
      alert('failed to process message: ' + error)
      stopByError = true
      socket.close()
    }

  }
  socket.onclose = () => {
    statusNode.textContent = 'Connection lost, reconnecting...'
    let interval = 300 + Math.random() * 800
    setTimeout(reconnect, interval)
  }
  socket.onerror = error => {
    console.error('WebSocket error:', error)
    alert('WebSocket error: ' + error)
    socket.close()
    reconnect()
  }
  return socket
}

connect()

function reconnect() {
  socket = connect()
}

function send(message: Uint8Array, flag?: 'wait') {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(message)
    return
  }
  if (flag === 'wait') {
    setTimeout(send, 100, message, flag)
  }
}

shareButton.onclick = async () => {
  try {
    statusNode.textContent = 'Sharing my screen...'

    let container = document.createElement('div')
    container.classList.add('screen-share-container')
    document.body.appendChild(container)

    let stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    })

    let settings = stream.getVideoTracks()[0].getSettings()

    let senderFPSContainer = document.createElement('div')
    addText(senderFPSContainer, 'Sender FPS: ')
    let senderFPSText = addText(
      senderFPSContainer,
      senderFPSCounter.getFPS().toFixed(1),
    )
    container.appendChild(senderFPSContainer)

    let messageSizeContainer = document.createElement('div')
    addText(messageSizeContainer, 'Message Size: ')
    let messageSizeText = addText(messageSizeContainer, '-')
    addText(messageSizeContainer, ' bytes')
    container.appendChild(messageSizeContainer)

    let quality = +localStorage.getItem('quality')! || 0.8
    let qualityContainer = document.createElement('div')
    qualityContainer.style.display = 'flex'
    qualityContainer.style.alignItems = 'center'
    addText(qualityContainer, 'Quality: ')
    let qualityText = addText(qualityContainer, quality.toFixed(2) + ' ')
    let qualityInput = createRangeInput()
    qualityContainer.appendChild(qualityInput)
    qualityInput.value = quality.toString()
    qualityInput.oninput = event => {
      quality = qualityInput.valueAsNumber
      qualityText.textContent = quality.toFixed(2) + ' '
      localStorage.setItem('quality', quality.toString())
    }
    container.appendChild(qualityContainer)

    let stopButton = document.createElement('button')
    addText(stopButton, 'Stop Sharing Screen (')
    let sizeText = addText(stopButton, `${settings.width}x${settings.height}`)
    addText(stopButton, ')')
    stopButton.onclick = () => {
      stream.getTracks().forEach(track => {
        track.stop()
      })
      video.srcObject = null
      container.remove()
      cancelAnimationFrame(timer)
      if (!document.querySelector('.screen-share-container')) {
        send(new Uint8Array([stopSharingMessage]))
        statusNode.textContent = 'Stopped sharing screen'
      }
    }
    container.appendChild(stopButton)

    container.appendChild(document.createElement('br'))

    let video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    container.appendChild(video)
    await new Promise<void>(resolve => {
      video.onloadedmetadata = () => {
        resolve()
      }
      video.srcObject = stream
      video.play()
    })

    let canvas = document.createElement('canvas')
    let context = canvas.getContext('2d')!

    let lastFrameTime = 0
    async function shareScreen() {
      if (stopByError) {
        return
      }
      if (socket.bufferedAmount > 0) {
        timer = requestAnimationFrame(shareScreen)
        return
      }

      let currentTime = performance.now()
      let timeSinceLastFrame = currentTime - lastFrameTime
      if (timeSinceLastFrame < 1000 / (targetFPS / 0.9) && limitFPS) {
        timer = requestAnimationFrame(shareScreen)
        return
      }
      lastFrameTime = currentTime

      let newSettings = stream.getVideoTracks()[0].getSettings()
      if (
        newSettings.width !== settings.width ||
        newSettings.height !== settings.height
      ) {
        settings = newSettings
        sizeText.textContent = `${settings.width}x${settings.height}`
      }

      drawScreen(canvas, context, video)
      let message = await makeScreenMessage(canvas, quality)
      send(message)
      messageSizeText.textContent = message.length.toLocaleString()

      senderFPSCounter.tick()
      senderFPSText.textContent = senderFPSCounter.getFPS().toFixed(1)

      timer = requestAnimationFrame(shareScreen)
    }

    send(new Uint8Array([shareMessage]), 'wait')

    senderFPSCounter.reset()
    senderFPSText.textContent = '-'

    let timer = requestAnimationFrame(shareScreen)
  } catch (error) {
    console.error('failed to share screen')
    statusNode.textContent = 'failed to share screen'
  }
}

subscribeButton.onclick = async () => {
  statusNode.textContent = 'Subscribing to remote screen...'

  receiverFPSCounter.reset()

  let container = document.createElement('div')

  let buttons = document.createElement('div')
  buttons.classList.add('buttons')
  container.appendChild(buttons)

  let stopButton = document.createElement('button')
  stopButton.textContent = 'Stop Subscribing'
  stopButton.onclick = () => {
    remoteVideo.srcObject = null
    container.remove()
    send(new Uint8Array([unsubscribeMessage]))
    statusNode.textContent = 'Stopped subscribing to remote screen'
  }
  buttons.appendChild(stopButton)

  let fullScreenButton = document.createElement('button')
  fullScreenButton.textContent = 'Fullscreen'
  fullScreenButton.onclick = () => {
    remoteVideo.requestFullscreen()
  }
  buttons.appendChild(fullScreenButton)

  let snapshotButton = document.createElement('button')
  snapshotButton.textContent = 'Snapshot'
  snapshotButton.onclick = async () => {
    let timestamp = getTimestamp().replaceAll(' ', '_').replaceAll(':', '-')
    let filename = `snapshot_${timestamp}.jpg`

    let blob = await new Promise<Blob | null>(resolve => {
      remoteCanvas.toBlob(resolve, 'image/jpeg', 0.8)
    })
    if (!blob) return

    let url = URL.createObjectURL(blob)
    let link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
  buttons.appendChild(snapshotButton)

  container.appendChild(remoteVideo)

  document.body.appendChild(container)

  remoteVideo.muted = true
  remoteVideo.playsInline = true
  remoteVideo.srcObject = remoteCanvas.captureStream()
  remoteVideo.play()

  send(new Uint8Array([subscribeMessage]), 'wait')
}

function drawScreen(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement,
) {
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
  let watermarkPosition = getWatermarkPosition(canvas)
  if (watermarkPosition) {
    context.drawImage(
      watermarkImage,
      watermarkPosition.x,
      watermarkPosition.y,
      watermarkImage.naturalWidth,
      watermarkImage.naturalHeight,
    )
  }
}

function getWatermarkPosition(canvas: HTMLCanvasElement) {
  if (!watermarkPosition) {
    return null
  }
  let image = {
    width: watermarkImage.naturalWidth,
    height: watermarkImage.naturalHeight,
  }
  switch (watermarkPosition) {
    case 'top-left':
      return {
        x: 0,
        y: 0,
      }
    case 'top-right':
      return {
        x: canvas.width - image.width,
        y: 0,
      }
    case 'bottom-left':
      return {
        x: 0,
        y: canvas.height - image.height,
      }
    case 'bottom-right':
      return {
        x: canvas.width - image.width,
        y: canvas.height - image.height,
      }
    case 'center':
      return {
        x: (canvas.width - image.width) / 2,
        y: (canvas.height - image.height) / 2,
      }
    default:
      throw new Error(`unknown watermark position: ${watermarkPosition}`)
  }
}

async function loadSettings() {
  let res = await fetch('/settings')
  let json = await res.json()
  limitFPS = json.limitFPS

  res = await fetch('/watermark/position')
  if (res.status == 404) {
    return
  }
  let position = await res.text()
  await new Promise(resolve => {
    watermarkImage.onload = resolve
    watermarkImage.src = '/watermark/image'
  })
  watermarkPosition = position as Position
}
loadSettings()

function getTimestamp() {
  let date = new Date()
  let y = date.getFullYear()
  let m = date.getMonth() + 1
  let d = date.getDate()
  let H = date.getHours()
  let M = date.getMinutes()
  let S = date.getSeconds()
  let ms = date.getMilliseconds()
  return `${y}-${m}-${d} ${H}:${M}:${S}.${ms}`
}

function querySelector<E extends HTMLElement>(selector: string) {
  let element = document.querySelector<E>(selector)
  if (!element) {
    throw new Error(`Element not found: "${selector}"`)
  }
  return element
}

function addText(container: HTMLElement, text: string) {
  let node = document.createTextNode(text)
  container.appendChild(node)
  return node
}

function createRangeInput() {
  let input = document.createElement('input')
  input.type = 'range'
  input.min = '0.05'
  input.max = '1'
  input.step = '0.05'
  return input
}
