import http from 'http'
import express from 'express'
import { Server as WebSocketServer, WebSocket } from 'ws'
import { print } from 'listening-on'
import {
  screenMessage,
  shareMessage,
  subscribeMessage,
  unsubscribeMessage,
} from './message'

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const port = 8100
const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })

let sharer: WebSocket | null = null
let subscribers = new Set<WebSocket>()

wss.on('connection', socket => {
  socket.on('message', data => {
    if (!(data instanceof Buffer)) {
      console.log('received invalid data, closing connection')
      socket.close()
      return
    }
    switch (data[0]) {
      case shareMessage:
        sharer = socket
        break
      case subscribeMessage:
        subscribers.add(socket)
        break
      case unsubscribeMessage:
        subscribers.delete(socket)
        break
      case screenMessage:
        subscribers.forEach(subscriber => {
          subscriber.send(data)
        })
        break
      default:
        console.log('received unknown message, closing connection')
        socket.close()
    }
  })
})

server.listen(port, () => {
  print(port)
})
