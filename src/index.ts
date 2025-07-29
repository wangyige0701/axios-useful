import { checkFrequency, Fn, isString, ParallelTask, toArray } from '@wang-yige/utils';
import axios, {
	type Axios,
	type InternalAxiosRequestConfig,
	type AxiosResponse,
	type AxiosInterceptorManager,
	type CreateAxiosDefaults,
} from 'axios';
import type {
	RequestConfig,
	InterceptRequestConfig,
	InterceptResponseConfig,
	RequestConfigWithAbort,
	RequestPromise,
	InitialConfig,
} from '@/@types';
import { CacheController } from './utils/cache';
import { SingleController } from './utils/single';
import { SingleType } from './utils/enum';

const noDataMethods = ['get', 'delete', 'head', 'options'] as const;
const withDataMethods = ['post', 'put', 'patch', 'postForm', 'putForm', 'patchForm'] as const;
const defineConfig = {
	writable: false,
	configurable: false,
};

class AxiosRequestInstance {
	/** The data of single types */
	static Single = SingleType;

	static create(config?: InitialConfig & CreateAxiosDefaults): AxiosRequestInstance;
	static create(
		baseURL?: string,
		config?: InitialConfig & Omit<CreateAxiosDefaults, 'baseURL'>,
	): AxiosRequestInstance;
	static create(
		baseURL?: string | (InitialConfig & CreateAxiosDefaults),
		config?: InitialConfig & Omit<CreateAxiosDefaults, 'baseURL'>,
	) {
		if (isString(baseURL)) {
			return new AxiosRequestInstance(baseURL, config);
		}
		return new AxiosRequestInstance(baseURL);
	}

	#domains?: string[] = void 0;
	#maximum: number = 5;

	#axios: Axios;
	#pipeline: ParallelTask;
	#frequency: Fn<[number, string?], any> | undefined = void 0;

	// 拦截器重置
	#requestInterceptor: {
		onFulfilled: (
			value: InternalAxiosRequestConfig<any>,
		) => InternalAxiosRequestConfig<any> | Promise<InternalAxiosRequestConfig<any>>;
		onRejected: (error: any) => any;
	};
	#requestInterceptorIndex: number;
	#responseInterceptorIndex: number;

	// 控制器实例
	#cacheController: CacheController;
	#singleController: SingleController;

	constructor(config?: InitialConfig & CreateAxiosDefaults);
	constructor(baseURL?: string, config?: InitialConfig & Omit<CreateAxiosDefaults, 'baseURL'>);
	constructor(
		baseURL?: string | (InitialConfig & CreateAxiosDefaults),
		config?: InitialConfig & Omit<CreateAxiosDefaults, 'baseURL'>,
	) {
		if (!isString(baseURL)) {
			config = baseURL;
			baseURL = baseURL?.baseURL;
		}
		const { maximum = 5, domains, requestLimit = 50 } = config || {};
		this.#maximum = Math.max(1, +maximum || 5);
		this.#pipeline = new ParallelTask(this.#maximum);
		const _limit = +requestLimit || 0;
		if (_limit > 0) {
			this.#frequency = checkFrequency({ range: 1000, maximum: _limit }, (_, current, path) => {
				throw new Error(
					`The request frequency is over the limit in one second. Current count is ${current} with path '${path}' \n` +
						"It's maybe an infinite loop, and if you want to continue, you can set the `requestLimit` to a bigger number or zero.",
				);
			});
		}
		if (domains) {
			this.#domains = toArray(domains);
		}
		const defaultConfig = { ...config };
		delete defaultConfig.domains;
		delete defaultConfig.maximum;

		this.#axios = axios.create({ ...defaultConfig, baseURL });
		this.#cacheController = new CacheController(this.#axios);
		this.#singleController = new SingleController(this.#axios, this.#pipeline, this);

		// 保证请求拦截器的执行顺序
		this.#requestInterceptor = Object.freeze({
			onFulfilled: (config: InterceptRequestConfig) => {
				this.#cacheController.request(config);
				return config;
			},
			onRejected: err => {
				return Promise.reject(err);
			},
		});
		this.#requestInterceptorIndex = this.#axios.interceptors.request.use(
			this.#requestInterceptor.onFulfilled,
			this.#requestInterceptor.onRejected,
		);
		this.#responseInterceptorIndex = this.#axios.interceptors.response.use(
			(response: AxiosResponse<any, any> & InterceptResponseConfig) => {
				this.#cacheController.response(response.config, response);
				return response;
			},
			async err => {
				if (CacheController.isResponseCache(err)) {
					// 缓存命中
					return Promise.resolve(err.response);
				}
				return Promise.reject(err);
			},
		);

		// 代理 axios 实例的请求方法
		noDataMethods.forEach(method => {
			const _method = this.#axios[method].bind(this.#axios) as Fn<
				[url: string, config: RequestConfig],
				Promise<any>
			>;
			Object.defineProperty(this, method, {
				...defineConfig,
				value: <T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>) => {
					return this.#proxy<R, [string]>(_method, [url], url, config);
				},
			});
		});
		withDataMethods.forEach(method => {
			const _method = this.#axios[method].bind(this.#axios) as Fn<
				[url: string, data: any, config: RequestConfig],
				Promise<any>
			>;
			Object.defineProperty(this, method, {
				...defineConfig,
				value: <T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>) => {
					return this.#proxy<R, [string, D?]>(_method, [url, data], url, config);
				},
			});
		});
	}

	/**
	 * Registered domains
	 */
	get domains() {
		return this.#domains;
	}

	get defaults() {
		return this.#axios.defaults;
	}

	/**
	 * Current axios instance, with don't have wrapper methods
	 */
	get axios() {
		return this.#axios;
	}

	/**
	 * Axios static object
	 */
	get Axios() {
		return axios;
	}

	#interceptors: Axios['interceptors'] | undefined;

	/**
	 * Request interceptor
	 */
	get interceptors() {
		if (this.#interceptors) {
			return this.#interceptors;
		}
		this.#interceptors = Object.create(null);
		const request = this.#axios.interceptors.request;
		const response = this.#axios.interceptors.response;
		Object.defineProperty(this.#interceptors, 'request', {
			...defineConfig,
			value: Object.freeze({
				use: (...args) => {
					request.eject(this.#requestInterceptorIndex);
					const index = request.use(...args);
					this.#requestInterceptorIndex = request.use(
						this.#requestInterceptor.onFulfilled,
						this.#requestInterceptor.onRejected,
					);
					return index;
				},
				eject: (id: number) => {
					if (id === this.#requestInterceptorIndex) {
						return;
					}
					return request.eject(id);
				},
				clear: () => request.clear(),
			} as AxiosInterceptorManager<InternalAxiosRequestConfig<any>>),
		});
		Object.defineProperty(this.#interceptors, 'response', {
			...defineConfig,
			value: Object.freeze({
				use: (...args) => response.use(...args),
				eject: (id: number) => {
					if (id === this.#responseInterceptorIndex) {
						return;
					}
					return response.eject(id);
				},
				clear: () => response.clear(),
			} as AxiosInterceptorManager<AxiosResponse<any, any>>),
		});
		return this.#interceptors!;
	}

	/**
	 * Change the maximum number of parallel requests pipeline.
	 */
	maximum(maximum: number) {
		this.#pipeline.changeMaxParallelCount(Math.max(1, +maximum || 5));
	}

	getUri(config?: RequestConfig) {
		return this.#axios.getUri(config);
	}

	// api methods

	#proxy<R, P extends any[]>(
		fn: Fn<[...P, config: RequestConfig], Promise<any>>,
		rests: P,
		url: string,
		config: RequestConfigWithAbort = {},
	) {
		this.#frequency && this.#frequency(1, url);
		return this.#singleController.request<R, P>(fn, rests, url, { ...config }) as RequestPromise<R>;
	}

	// @ts-expect-error
	get<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>): RequestPromise<R>;
	// @ts-expect-error
	delete<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>): RequestPromise<R>;
	// @ts-expect-error
	head<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>): RequestPromise<R>;
	// @ts-expect-error
	options<T = any, R = AxiosResponse<T>, D = any>(url: string, config?: RequestConfig<D>): RequestPromise<R>;
	// @ts-expect-error
	post<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>): RequestPromise<R>;
	// @ts-expect-error
	put<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>): RequestPromise<R>;
	// @ts-expect-error
	patch<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>): RequestPromise<R>;
	// @ts-expect-error
	// prettier-ignore
	postForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>): RequestPromise<R>
	// @ts-expect-error
	// prettier-ignore
	putForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>): RequestPromise<R>
	// @ts-expect-error
	// prettier-ignore
	patchForm<T = any, R = AxiosResponse<T>, D = any>(url: string, data?: D, config?: RequestConfig<D>): RequestPromise<R>
}

let defaultInstance: AxiosRequestInstance;
[...noDataMethods, ...withDataMethods].forEach(method => {
	Object.defineProperty(AxiosRequestInstance, method, {
		...defineConfig,
		value: (...args: any[]) => {
			if (!defaultInstance) {
				defaultInstance = new AxiosRequestInstance('');
			}
			// @ts-expect-error
			return defaultInstance[method](...args);
		},
	});
});

type AxiosRequestStatic = typeof AxiosRequestInstance &
	Pick<AxiosRequestInstance, (typeof noDataMethods)[number] | (typeof withDataMethods)[number]>;

/** A wrapper of `Axios` */
const AxiosRequest: AxiosRequestStatic = AxiosRequestInstance as any;

/** alias of `AxiosRequest` */
const APIRequest = AxiosRequest;

export { AxiosRequest, APIRequest, axios };
