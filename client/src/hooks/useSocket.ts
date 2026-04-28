import { useEffect, useRef } from 'react'
import type { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '../lib/socket'
import { useAuth } from './useAuth'

/**
 * Returns a stable Socket.io socket for the authenticated user.
 * Automatically connects on mount and disconnects on unmount (when
 * `autoDisconnect` is true, which is the default for leaf components).
 *
 * Usage:
 *   const socket = useSocket()
 *   useEffect(() => {
 *     socket?.on('message:new', handler)
 *     return () => { socket?.off('message:new', handler) }
 *   }, [socket])
 */
export function useSocket(autoDisconnect = false): Socket | null {
  const { token } = useAuth()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    socketRef.current = getSocket(token)

    return () => {
      if (autoDisconnect) {
        disconnectSocket()
        socketRef.current = null
      }
    }
  }, [token, autoDisconnect])

  return socketRef.current
}
