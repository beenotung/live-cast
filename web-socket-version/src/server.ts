import http from 'http'
import express from 'express'
import { Server as WebSocketServer, WebSocket } from 'ws'
import { print } from 'listening-on'
import {
  receivedMessage,
  screenMessage,
  shareMessage,
  stopSharingMessage,
  subscribeMessage,
  unsubscribeMessage,
  makeIdMessage,
} from './message'

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const port = 8100
const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })

let sharer: WebSocket | null = null
let subscribers = new Map<WebSocket, number>()

let lastReceiverId = 0

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
      case stopSharingMessage:
        sharer = null
        break
      case subscribeMessage: {
        let id = subscribers.get(socket)
        if (!id) {
          lastReceiverId++
          id = lastReceiverId
          subscribers.set(socket, id)
        }
        socket.send(makeIdMessage(id))
        break
      }
      case unsubscribeMessage:
        subscribers.delete(socket)
        break
      case screenMessage:
        for (let socket of subscribers.keys()) {
          if (socket.bufferedAmount == 0) {
            socket.send(data)
          }
        }
        break
      case receivedMessage:
        sharer?.send(data)
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
