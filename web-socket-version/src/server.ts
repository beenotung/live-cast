import http from 'http'
import express from 'express'
import { Server as WebSocketServer } from 'ws'
import { print } from 'listening-on'

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

const port = 8100
const server = http.createServer(app)

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', socket => {
  socket.on('message', data => {
    console.log('received message:', data)
    // for (const client of wss.clients) {
    //   if (client.readyState === client.OPEN) {
    //     client.send(String(data))
    //   }
    // }
  })
})

server.listen(port, () => {
  print(port)
})
