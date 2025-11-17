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

let statusNode = querySelector('#status')
let shareButton = querySelector('#shareButton')
let subscribeButton = querySelector('#subscribeButton')
let snapshotButton = querySelector('#snapshotButton')
let receiverFPSText = querySelector('#receiverFPS')

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
    let blob = event.data as Blob
    let message = await blob.bytes()
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
        let imageData = parseScreenMessage(message)
        remoteCanvas.width = imageData.width
        remoteCanvas.height = imageData.height
        remoteContext.putImageData(imageData, 0, 0)
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
  }
  socket.onclose = () => {
    statusNode.textContent = 'Connection lost, reconnecting...'
    let interval = 300 + Math.random() * 800
    setTimeout(reconnect, interval)
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
    function shareScreen() {
      if (socket.bufferedAmount > 0) {
        requestAnimationFrame(shareScreen)
        return
      }

      let currentTime = performance.now()
      let timeSinceLastFrame = currentTime - lastFrameTime
      if (timeSinceLastFrame < 1000 / targetFPS && limitFPS) {
        requestAnimationFrame(shareScreen)
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

      send(makeScreenMessage(canvas, context, video))

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

  let stopButton = document.createElement('button')
  stopButton.textContent = 'Stop Subscribing'
  stopButton.onclick = () => {
    remoteVideo.srcObject = null
    remoteVideo.remove()
    stopButton.remove()
    send(new Uint8Array([unsubscribeMessage]))
  }
  document.body.appendChild(stopButton)

  document.body.appendChild(remoteVideo)

  remoteVideo.muted = true
  remoteVideo.playsInline = true
  remoteVideo.srcObject = remoteCanvas.captureStream()
  remoteVideo.play()

  send(new Uint8Array([subscribeMessage]), 'wait')
}

snapshotButton.onclick = async () => {
  let timestamp = getTimestamp().replaceAll(' ', '_').replaceAll(':', '-')
  let filename = `snapshot_${timestamp}.jpg`
  remoteCanvas.toBlob(
    async blob => {
      if (!blob) return

      let url = URL.createObjectURL(blob)
      let link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    'image/jpeg',
    0.8,
  )
}

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
