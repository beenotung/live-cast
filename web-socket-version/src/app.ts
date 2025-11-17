let statusNode = querySelector('#status')
let shareButton = querySelector('#shareButton')
let subscribeButton = querySelector('#subscribeButton')

shareButton.addEventListener('click', () => {
  statusNode.textContent = 'Sharing my screen...'
})

subscribeButton.addEventListener('click', () => {
  statusNode.textContent = 'Subscribing to remote screen...'
})

statusNode.textContent = 'Ready'

function querySelector<E extends HTMLElement>(selector: string) {
  let element = document.querySelector<E>(selector)
  if (!element) {
    throw new Error(`Element not found: "${selector}"`)
  }
  return element
}
