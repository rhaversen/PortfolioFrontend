export interface UserType {
	/** ID of the user */
	_id: string
	/** Username of the user */
	username: string
	/** Email of the user (null when viewing another user's profile) */
	email: string | null
	/** If the user has confirmed their email (null when viewing another user's profile) */
	confirmed: boolean | null
	/** Account expiration date (null when viewing another user's profile) */
	expirationDate: string | null
	// Timestamps
	createdAt: string
	updatedAt: string
}
