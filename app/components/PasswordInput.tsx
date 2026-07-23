import React, { type ChangeEvent, type ReactElement } from 'react'

interface PasswordInputProps {
	name: string
	value: string
	placeholder?: string
	onChange: (e: ChangeEvent<HTMLInputElement>) => void
	borderColor?: string
	inputType?: 'password' | 'text'
	autoComplete?: string
}

export default function PasswordInput ({
	name,
	value,
	placeholder,
	onChange,
	borderColor,
	inputType = 'password',
	autoComplete
}: PasswordInputProps): ReactElement {
	return (
		<input
			type={inputType}
			name={name}
			value={value}
			placeholder={placeholder}
			onChange={onChange}
			autoComplete={autoComplete}
			className={`w-full px-3 py-2 text-foreground bg-card border border-border
			focus:ring-2 focus:ring-accent focus:border-accent outline-none sm:text-sm
			${borderColor ?? ''}`}
		/>
	)
}
