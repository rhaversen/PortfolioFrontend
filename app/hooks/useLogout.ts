import { useCallback } from 'react'
import { useRouter } from 'next/navigation'

import api from '@/app/lib/api'
import { useError } from '@/app/contexts/ErrorContext/ErrorContext'
import { useUser } from '@/app/contexts/UserProvider'

export const useLogout = (): { logout: () => void } => {
	const router = useRouter()
	const { addError } = useError()
	const { refetchUser } = useUser()

	const logout = useCallback((): void => {
		api.post('/v1/auth/logout-local', {})
			.then(() => refetchUser())
			.then(() => router.push('/'))
			.catch(addError)
	}, [router, refetchUser, addError])

	return { logout }
}
