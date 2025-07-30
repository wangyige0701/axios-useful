import type { InternalAxiosRequestConfig, AxiosResponse, Axios } from 'axios';
import { isBoolean, isNumber, upperCase } from '@wang-yige/utils';
import type { InterceptRequestConfig, InterceptResponseConfig } from '@/@types';
import { Methods } from './enum';

class ResponseCache {
	response: AxiosResponse<any, any>;

	constructor(cache: AxiosResponse<any, any>) {
		this.response = cache;
	}
}

export class CacheController {
	static isResponseCache(cache: any): cache is ResponseCache {
		return cache instanceof ResponseCache;
	}

	private _axios: Axios;
	private cacheKeys: WeakMap<InternalAxiosRequestConfig, string> | undefined;
	private cache: Map<string, { response: AxiosResponse; timestamp: number }> | undefined;

	constructor(axios: Axios) {
		this._axios = axios;
	}

	public request(config: InterceptRequestConfig) {
		const cacheConfig = config.cache;
		if (!cacheConfig) {
			// undefined or false
			return;
		}
		const { time } = isBoolean(cacheConfig) ? { time: -1 } : cacheConfig;
		if (!isNumber(time) || time === 0) {
			return;
		}
		if (!this.cache) {
			this.cache = new Map();
		}
		const cacheValue = this.getCache(config);
		if (cacheValue) {
			const { response, timestamp } = cacheValue;
			if (isNumber(time) && time > 0 && Date.now() - timestamp > time) {
				this.deleteCache(config);
			} else {
				throw new ResponseCache(response);
			}
		}
	}

	public response(config: InterceptResponseConfig['config'], response: AxiosResponse & InterceptResponseConfig) {
		const { cache = false } = config;
		if (!cache) {
			return;
		}
		if (!this.cache) {
			this.cache = new Map();
		}
		if (!this.hasCache(config)) {
			const { time } = isBoolean(cache) ? { time: -1 } : cache;
			if (!isNumber(time) || time === 0) {
				return;
			}
			this.setCache(config, response);
		}
	}

	private hasCache(config: InternalAxiosRequestConfig) {
		return this.cache!.has(this.cacheKey(config));
	}

	private getCache(config: InternalAxiosRequestConfig) {
		if (this.hasCache(config)) {
			return this.cache!.get(this.cacheKey(config))!;
		}
	}

	private setCache(config: InternalAxiosRequestConfig, cache: AxiosResponse<any, any>) {
		return this.cache!.set(this.cacheKey(config), { response: cache, timestamp: Date.now() });
	}

	private deleteCache(config: InternalAxiosRequestConfig) {
		return this.cache!.delete(this.cacheKey(config));
	}

	private cacheKey(config: InternalAxiosRequestConfig) {
		if (!this.cacheKeys) {
			this.cacheKeys = new WeakMap();
		}
		if (this.cacheKeys.has(config)) {
			return this.cacheKeys.get(config)!;
		}
		const { method = Methods.GET } = config;
		const methodUpper = upperCase(method);
		if (methodUpper !== Methods.GET.toUpperCase()) {
			throw new Error('Cache only supported for the `GET` method');
		}
		const key = `//${methodUpper}::${this._axios.getUri(config)}`;
		this.cacheKeys.set(config, key);
		return key;
	}
}
