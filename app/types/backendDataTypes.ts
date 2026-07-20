export interface UserType {
	/** ID of the user */
	_id: string
	/** Username of the user */
	username: string
	/** Email of the user */
	email: string
	/** If the user has confirmed their email */
	confirmed: boolean
	// Timestamps
	createdAt: string
	updatedAt: string
}
