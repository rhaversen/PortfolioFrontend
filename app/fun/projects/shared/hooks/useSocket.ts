'use client'

import { useEffect, useRef, type DependencyList } from 'react'
import { io, type Socket } from 'socket.io-client'

/**
 * Opens a socket.io connection for the lifetime of the component (or for the lifetime
 * of `deps`), wiring up event handlers via `setup`, and disconnects on cleanup.
 *
 * Mirrors the connect/cleanup boilerplate every LLM-backed project repeats.
 */
export function useSocket(setup: (socket: Socket) => void, deps: DependencyList = []) {
	const socketRef = useRef<Socket | null>(null)

	useEffect(() => {
		const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? '/')
		socketRef.current = socket
		setup(socket)
		return () => {
			socket.disconnect()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, deps)

	return socketRef
}
