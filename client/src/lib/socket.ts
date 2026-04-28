import { io  } from 'socket.io-client'
import type {Socket} from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (socket?.connected) return socket

  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    reconnectionAttempts: 5,
  })

  socket.on('connect', () => console.log('[socket] connected'))
  socket.on('disconnect', (reason) =>
    console.log('[socket] disconnected', reason),
  )
  socket.on('connect_error', (err) =>
    console.error('[socket] error', err.message),
  )

  return socket
}

export function disconnectSocket() {
  socket?.disconnect()
  socket = null
}
