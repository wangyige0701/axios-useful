import axios, { AxiosError } from 'axios';
import {
	type Fn,
	delay,
	isArray,
	isBoolean,
	isDef,
	isGeneralObject,
	isNumber,
	isString,
	toArray,
} from '@wang-yige/utils';
import type { CodeRange, RequestConfig, RequestConfigWithAbort, RetryCodeRange } from '@/@types';

// ECONNREFUSED 在 node 环境中使用
const DefaultRetryErrorCodes = [AxiosError.ECONNABORTED, AxiosError.ERR_NETWORK, AxiosError.ETIMEDOUT, 'ECONNREFUSED'];
const DefaultResponseCodes = [500, 404, 502];
const DefaultRequestCodes = [404];

function checkRetryCodeRange(range: any) {
	return (
		isGeneralObject(range) &&
		range.hasOwnProperty('from') &&
		range.hasOwnProperty('to') &&
		isNumber((range as any).from) &&
		isNumber((range as any).to)
	);
}

/**
 * 解析重试状态码范围
 */
export function parseCodeRange(range: RetryCodeRange) {
	const ranges = [] as Array<CodeRange>;
	if (isNumber(range) || (isArray(range) && range.every(isNumber))) {
		const _range = toArray(range).sort((a, b) => a - b);
		ranges.push(
			..._range.reduce((prev, curr) => {
				const last = prev[prev.length - 1];
				if (!last || last.to + 1 !== curr) {
					prev.push({ from: curr, to: curr });
					return prev;
				}
				last.to = curr;
				return prev;
			}, [] as Array<CodeRange>),
		);
	} else if (isString(range)) {
		ranges.push(
			...range.split(',').reduce((prev, curr) => {
				let [from, to] = curr.split('-').map(Number);
				if (from > to) {
					[from, to] = [to, from];
				}
				prev.push({ from: from, to: to });
				return prev;
			}, [] as Array<CodeRange>),
		);
	} else {
		const _range = toArray(range);
		if (!_range.every(checkRetryCodeRange)) {
			throw new Error('Invalid retry code range');
		}
		ranges.push(..._range);
	}
	const cache = new Map<number, boolean>();
	return (code: number | string) => {
		const _code = +code;
		if (cache.has(_code)) {
			return cache.get(_code)!;
		}
		for (const { from, to } of ranges) {
			if (from <= _code && _code <= to) {
				cache.set(_code, true);
				return true;
			}
		}
		cache.set(_code, false);
		return false;
	};
}

function parseErrorReasons(reasons: string | string[]) {
	const _reasons = toArray(reasons);
	const cache = new Map<string, boolean>();
	return (reason: string) => {
		if (cache.has(reason)) {
			return cache.get(reason)!;
		}
		cache.set(reason, _reasons.includes(reason));
		return cache.get(reason)!;
	};
}

export function requestWithRetry<P extends any[], T extends Promise<any>>(
	fn: Fn<[...P, config: RequestConfig], T>,
	rests: P,
	config: RequestConfigWithAbort,
): T {
	const retryConfig = config.retry;
	if (!retryConfig) {
		return fn(...rests, config);
	}
	const _config = isBoolean(retryConfig) ? {} : retryConfig;
	const {
		errorReasons = DefaultRetryErrorCodes,
		badResponseCodes = DefaultResponseCodes,
		badRequestCodes = DefaultRequestCodes,
		domains = void 0,
	} = _config;
	const isErrorReasons = parseErrorReasons(errorReasons);
	let isBadResponseCodes: Fn<[number | string], boolean> | void;
	let isBadRequestCodes: Fn<[number | string], boolean> | void;
	if (!isErrorReasons(AxiosError.ERR_BAD_RESPONSE)) {
		isBadResponseCodes = parseCodeRange(badResponseCodes);
	}
	if (!isErrorReasons(AxiosError.ERR_BAD_REQUEST)) {
		isBadRequestCodes = parseCodeRange(badRequestCodes);
	}
	const retryDelay = isNumber(_config.delay) ? Math.max(_config.delay, 0) : 1000;
	const retryCount = isNumber(_config.count) ? Math.max(_config.count, 1) : 5;

	let changeDomain = false;
	let domainIndex = -1;
	let domainList: string[];
	if (isArray(domains) && domains.length) {
		changeDomain = true;
		domainList = [...(domains || [])];
	}
	const useRetry = async (n: number = 0): Promise<any> => {
		let requestConfig = config;
		if (changeDomain) {
			// 循环修改请求域名
			const index = domainIndex++;
			if (domainIndex >= domainList.length) {
				domainIndex = -1;
			}
			if (index >= 0) {
				const target = domainList[index];
				requestConfig = {
					...config,
					...(isDef(target) ? { baseURL: domainList[index] } : {}),
				};
			}
		}
		return fn(...rests, requestConfig).catch(err => {
			// 请求取消或超出最大请求次数直接抛出
			if (axios.isCancel(err) || n >= retryCount) {
				return Promise.reject(err) as T;
			}
			if (
				isErrorReasons(err.code) ||
				(isBadResponseCodes && err.code === AxiosError.ERR_BAD_RESPONSE && isBadResponseCodes(err?.status)) ||
				(isBadRequestCodes && err.code === AxiosError.ERR_BAD_REQUEST && isBadRequestCodes(err?.status))
			) {
				return delay(retryDelay).then(() => useRetry(n + 1)) as T;
			}
			return Promise.reject(err) as T;
		}) as T;
	};
	return useRetry() as T;
}
