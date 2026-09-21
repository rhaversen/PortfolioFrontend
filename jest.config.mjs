import { readFileSync } from 'fs'

// TS6 infers rootDir from the common source directory, which breaks
// multi-directory suites — pin it to the repo root instead.
const tsconfig = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8'))

/** @type {import('jest').Config} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/app/$1'
	},
	testMatch: ['**/*.test.ts', '**/*.test.tsx'],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', {
			tsconfig: {
				...tsconfig.compilerOptions,
				rootDir: '.'
			}
		}]
	}
}

export default config
