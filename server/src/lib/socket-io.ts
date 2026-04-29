/**
 * Singleton holder for the Socket.io server instance.
 * Routes import `getIO()` to push real-time events without
 * needing to pass `io` through every function call.
 */
import type { Server as SocketIOServer } from 'socket.io'

let _io: SocketIOServer | null = null

export function setIO(io: SocketIOServer) {
  _io = io
}

export function getIO(): SocketIOServer | null {
  return _io
}
