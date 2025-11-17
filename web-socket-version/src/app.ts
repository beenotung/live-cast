import { shareMessage, subscribeMessage } from './message'

let statusNode = querySelector('#status')
let shareButton = querySelector('#shareButton')
let subscribeButton = querySelector('#subscribeButton')

let wsOrigin = location.origin.replace('http', 'ws')
let wsUrl = wsOrigin + '/ws'
let socket = connect()

let shareTimer = requestAnimationFrame(() => {
  /* placeholder for type hint */
})

function connect() {
  let socket = new WebSocket(wsUrl)
  socket.onopen = () => {
    statusNode.textContent = 'Connected to server'
  }
  socket.onmessage = event => {
    console.log('received message:', event.data)
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

    socket.send(shareMessage)

    function shareScreen() {
      let newSettings = stream.getVideoTracks()[0].getSettings()
      if (
        newSettings.width !== settings.width ||
        newSettings.height !== settings.height
      ) {
        settings = newSettings
        sizeText.textContent = `${settings.width}x${settings.height}`
      }
      requestAnimationFrame(shareScreen)
    }
    requestAnimationFrame(shareScreen)
  } catch (error) {
    console.error('failed to share screen')
    statusNode.textContent = 'failed to share screen'
  }
}

subscribeButton.onclick = async () => {
  statusNode.textContent = 'Subscribing to remote screen...'
  socket.send(subscribeMessage)
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
