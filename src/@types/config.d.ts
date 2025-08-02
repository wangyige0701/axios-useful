import type { SingleType } from '@/utils/enum';

export interface InitialConfig {
	/**
	 * Max number to sync request.
	 * - default `5`
	 */
	maximum?: number;
	/**
	 * Max number to trigger request by current url in one second,
	 * when pass in zero or negative, it will not check.
	 * - default `50`
	 */
	requestLimit?: number;
}

interface Single {
	/**
	 * The type for single request.
	 * - default is `SingleType.QUEUE`
	 */
	type?: SingleType;
}

interface Cache {
	/**
	 * Cache time in miliseconds.
	 * If time is zero, it will not be cached.
	 * If time is negative, it will not clear cache.
	 * - default `-1`
	 */
	time?: number;
}

export type CodeRange = { from: number; to: number };

export type RetryCodeRange = number | number[] | CodeRange | Array<CodeRange> | string;

interface Retry {
	/**
	 * Retry count.
	 * - default `5`
	 */
	count?: number;
	/**
	 * Delay time for retry in miliseconds.
	 * - default `1000`
	 */
	delay?: number;
	/**
	 * The axios error reasons to retry.
	 * - default `['ECONNABORTED', 'ERR_NETWORK, 'ETIMEDOUT', 'ECONNREFUSED']`
	 * `'ECONNREFUSED'` is only available in nodejs.
	 */
	errorReasons?: string | string[];
	/**
	 * If `retry.errorReasons` not include `ERR_BAD_RESPONSE`,
	 * this config will be matched when response `err.code` equals `ERR_BAD_RESPONSE`.
	 * - default codes are `500`, `404`, `502`
	 */
	badResponseCodes?: RetryCodeRange;
	/**
	 * If `retry.` not include `ERR_BAD_REQUEST`,
	 * this config will be matched when response `err.code` equals `ERR_BAD_REQUEST`.
	 * - default code is `404`
	 */
	badRequestCodes?: RetryCodeRange;
	/**
	 * The domains that can be retried.
	 */
	domains?: string[];
}

export interface CustomConfig {
	/**
	 * The same url request is only single at a time.
	 * Not include the params.
	 * - default `true`
	 */
	single?: boolean | Single;
	/**
	 * Cache the `Get` request response.
	 * - default `false`
	 */
	cache?: boolean | Cache;
	/**
	 * Retry the request if failed.
	 * - default `false`
	 */
	retry?: boolean | Retry;
}
