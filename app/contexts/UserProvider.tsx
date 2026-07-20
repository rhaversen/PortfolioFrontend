'use client'
import { useQuery } from '@tanstack/react-query'
import React, { createContext, type ReactNode, type ReactElement, useContext } from 'react'

import api from '@/app/lib/api'
import { type UserType } from '@/app/types/backendDataTypes'

interface UserContextType {
	currentUser: UserType | null
	isLoading: boolean
	error: Error | null
	refetchUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
	currentUser: null,
	isLoading: false,
	error: null,
	refetchUser: async () => {}
})

export const useUser = (): UserContextType => useContext(UserContext)

const fetchUser = async (): Promise<UserType | null> => {
	try {
		const { data } = await api.get<UserType>('/v1/auth/user')
		return data
	} catch (e) {
		console.warn('Error fetching user:', e)
		return null
	}
}

export default function UserProvider ({ children }: { readonly children: ReactNode }): ReactElement {
	const { data: currentUser, isLoading, error, refetch } = useQuery<UserType | null, Error, UserType | null, string[]>({
		queryKey: ['user'],
		queryFn: fetchUser,
		retry: false,
		staleTime: 5 * 60 * 1000
	})

	const value = React.useMemo(() => ({
		currentUser: currentUser ?? null,
		isLoading,
		error: error as Error | null,
		refetchUser: async () => {
			await refetch()
		}
	}), [currentUser, isLoading, error, refetch])

	return (
		<UserContext.Provider value={value}>
			{children}
		</UserContext.Provider>
	)
}
