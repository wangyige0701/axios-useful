export enum Methods {
	GET = 'GET',
	POST = 'POST',
	PUT = 'PUT',
	DELETE = 'DELETE',
}

export enum SingleType {
	/**
	 * Always use the next request,
	 * and if the prev request is not finished, it will be aborted.
	 */
	NEXT = 'next',
	/**
	 * Always use the prev request,
	 * and if current request is not finished, the latest request will be aborted.
	 */
	PREV = 'prev',
	/**
	 * If the prev request is not finished, the latest request will be added to the queue.
	 * - Default value
	 */
	QUEUE = 'queue',
}
