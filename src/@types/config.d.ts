import type { SingleType } from '@/utils/enum';
import type { AxiosResponse } from 'axios';
import { InterceptRequestConfig } from '.';

export interface InitialConfig {
	/**
	 * The maximum number of requests sent at the same time.
	 * - default `5`
	 */
	maximumInOneTime?: number;
	/**
	 * The limit number of requests sent in one second, if exceed, it will throw an axios CanceledError.
	 * If pass in zero or negative, it will not have any restrictions set.
	 * - default `50`
	 */
	limitInOneSecond?: number;
}

export interface Single {
	/**
	 * The type for single request.
	 * - default is `SingleType.QUEUE`
	 */
	type?: SingleType;
}

export interface Cache {
	/**
	 * Cache time in miliseconds.
	 * If time is zero, it will not be cached.
	 * If time is negative, it will not clear cache.
	 * - default `-1`
	 */
	time?: number;
	/**
	 * Validate the response if it is cached.
	 * @param response The response to validate.
	 * @returns If the response is cached.
	 */
	validate?: (response: AxiosResponse) => boolean;
	/**
	 * Validate whether the request is hit cache by custom logic.
	 * - The trigger is evaluated after checking the cache expiration. If it returns `false` while the cache is still valid, the cached result will not be used.
	 * @param config The request to validate.
	 * @returns If the request is hit cache.
	 */
	cacheHit?: (config: InterceptRequestConfig) => boolean;
}

export type CodeRange = { from: number; to: number };

export type RetryCodeRange = number | number[] | CodeRange | Array<CodeRange> | string;

export interface Retry {
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

export interface ExtraConfig {
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
