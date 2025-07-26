import type { Axios } from 'axios';
import { type Fn, createPromise, upperCase, ParallelTask, isBoolean, isUndef } from '@wang-yige/utils';
import type { AbortPromise, RequestConfig, RequestConfigWithAbort } from '@/@types';
import type { APIRequest } from '..';
import { Methods, SingleType } from './enum';
import { createAbortController } from './abort';
import { requestWithRetry } from './retry';

const replacePrefixSlash = /^\/*([^\/].*)$/;
const replaceSuffixSlash = /^(.*[^\/])\/*$/;

/**
 * In SingleController also handle pipeline and retry config.
 */
export class SingleController {
	#axios: Axios;
	#pipeline: ParallelTask;
	#singleTasks: Map<string, ParallelTask> = new Map();
	#singleNext: Map<string, Fn> = new Map();
	#singlePrev: Set<string> = new Set();
	#API: APIRequest;

	constructor(axios: Axios, pipeline: ParallelTask, _this: APIRequest) {
		this.#axios = axios;
		this.#pipeline = pipeline;
		this.#API = _this;
	}

	request<R>(fn: Fn<[config: RequestConfig], Promise<any>>, url: string, config: RequestConfigWithAbort) {
		const singleConfig = config.single;
		if (singleConfig || isUndef(singleConfig)) {
			// default is true, enter when singleConfig is undefined
			const { type = SingleType.QUEUE } = isBoolean(singleConfig) || isUndef(singleConfig) ? {} : singleConfig;
			const KEY = this.#singleKey(url, config);
			if (type === SingleType.QUEUE) {
				const { promise, resolve, reject } = createPromise<R, AbortPromise<R>>();
				if (!this.#singleTasks.has(KEY)) {
					this.#singleTasks.set(KEY, new ParallelTask(1));
					this.#singleTasks.get(KEY)!.onEmpty(() => {
						this.#singleTasks.delete(KEY);
					});
				}
				const tasks = this.#singleTasks.get(KEY)!;
				const task = async () => {
					await this.#send<R>(fn, config).then(resolve, reject);
				};
				const useTask = tasks.add(task);
				promise.abort = promise.cancel = () => {
					useTask.cancel();
					if (config.__abort) {
						config.__abort();
					}
				};
				return promise;
			}
			if (type === SingleType.NEXT) {
				if (this.#singleNext.has(KEY)) {
					this.#singleNext.get(KEY)?.();
				}
				const promise = this.#send<R>(fn, config);
				this.#singleNext.set(KEY, promise.abort);
				promise.finally(() => {
					this.#singleNext.delete(KEY);
				});
				return promise;
			}
			if (type === SingleType.PREV) {
				if (this.#singlePrev.has(KEY)) {
					throw new Error('The previous request has not been completed');
				}
				this.#singlePrev.add(KEY);
				const promise = this.#send<R>(fn, config);
				promise.finally(() => {
					this.#singlePrev.delete(KEY);
				});
				return promise;
			}
			throw new Error('Unknown single type');
		}
		return this.#send<R>(fn, config);
	}

	#singleKey(url: string, config: RequestConfig) {
		const { method = Methods.GET } = config;
		const baseURL = (this.#axios.defaults.baseURL || '').replace(replaceSuffixSlash, '$1');
		const path = (url || '').replace(replacePrefixSlash, '$1');
		return `//${upperCase(method)}::${baseURL}/${path}`;
	}

	#send<R>(fn: Fn<[config: RequestConfig], Promise<any>>, config: RequestConfigWithAbort = {}) {
		const abort = createAbortController(config);
		config.__abort = abort;
		// 添加并行管道执行项
		const promise = this.#pipeline.add(async config => {
			// 执行重试机制
			return await requestWithRetry(fn, config, this.#API.domains);
		}, config) as unknown as AbortPromise<R>;
		// 移除 index 属性
		delete (promise as Promise<void> & { index?: number }).index;
		const _cancelTask = promise.cancel;
		promise.abort = promise.cancel = () => {
			_cancelTask();
			abort();
		};
		return promise;
	}
}
