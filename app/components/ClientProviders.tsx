'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { type ReactNode } from 'react'

import ErrorProvider from '@/app/contexts/ErrorContext/ErrorProvider'
import UserProvider from '@/app/contexts/UserProvider'
import UnconfirmedBanner from '@/app/components/UnconfirmedBanner'

export default function ClientProviders ({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient())

	return (
		<QueryClientProvider client={queryClient}>
			<ErrorProvider>
				<UserProvider>
					<UnconfirmedBanner />
					{children}
				</UserProvider>
			</ErrorProvider>
		</QueryClientProvider>
	)
}
