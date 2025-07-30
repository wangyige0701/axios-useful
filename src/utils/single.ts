import type { Axios } from 'axios';
import axios from 'axios';
import { type Fn, createPromise, upperCase, ParallelTask, isBoolean, isUndef } from '@wang-yige/utils';
import type { RequestPromise, RequestConfig, RequestConfigWithAbort } from '@/@types';
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
	_axios: Axios;
	_pipeline: ParallelTask;
	_API: InstanceType<typeof APIRequest>;
	singleTasks: Map<string, ParallelTask> | undefined;
	singleNext: Map<string, Fn> | undefined;
	singlePrev: Set<string> | undefined;

	constructor(axios: Axios, pipeline: ParallelTask, _this: InstanceType<typeof APIRequest>) {
		this._axios = axios;
		this._pipeline = pipeline;
		this._API = _this;
	}

	public request<R, P extends any[]>(
		fn: Fn<[...P, config: RequestConfig], Promise<any>>,
		rests: P,
		url: string,
		config: RequestConfigWithAbort,
	): RequestPromise<R> {
		const singleConfig = config.single;
		if (singleConfig || isUndef(singleConfig)) {
			// default is true, enter when singleConfig is undefined
			const { type = SingleType.QUEUE } = isBoolean(singleConfig) || isUndef(singleConfig) ? {} : singleConfig;
			const KEY = this.singleKey(url, config);
			if (type === SingleType.QUEUE) {
				const { promise, resolve, reject } = createPromise<R, RequestPromise<R>>();
				if (!this.singleTasks) {
					this.singleTasks = new Map();
				}
				if (!this.singleTasks.has(KEY)) {
					this.singleTasks.set(KEY, new ParallelTask(1));
					this.singleTasks.get(KEY)!.onEmpty(() => {
						this.singleTasks!.delete(KEY);
					});
				}
				const tasks = this.singleTasks.get(KEY)!;
				const task = async () => {
					await this.send<R, P>(fn, rests, config).then(resolve, reject);
				};
				const useTask = tasks.add(task);
				promise.abort = promise.cancel = () => {
					useTask.cancel();
					if (config.__abort) {
						config.__abort();
					}
				};
				return promise as RequestPromise<R>;
			}
			if (type === SingleType.NEXT) {
				let isAbort = false;
				if (!this.singleNext) {
					this.singleNext = new Map();
				}
				if (this.singleNext.has(KEY)) {
					this.singleNext.get(KEY)?.();
				}
				const _promise = this.send<R, P>(fn, rests, config);
				this.singleNext.set(KEY, () => {
					isAbort = true;
					_promise.abort();
				});
				_promise.finally(() => {
					this.singleNext!.delete(KEY);
				});
				const { promise, resolve, reject } = createPromise<R>();
				_promise.then(resolve).catch(err => {
					if (isAbort) {
						return reject('This request has been canceled because of the next request is come.');
					}
					return reject(err);
				});
				(promise as RequestPromise<R>).cancel = _promise.cancel;
				(promise as RequestPromise<R>).abort = _promise.abort;
				return promise as RequestPromise<R>;
			}
			if (type === SingleType.PREV) {
				if (!this.singlePrev) {
					this.singlePrev = new Set();
				}
				const { promise, resolve, reject } = createPromise<R>();
				if (this.singlePrev.has(KEY)) {
					Promise.resolve().then(() => {
						reject(
							'This request has been canceled because of the previous request has not been completed.',
						);
					});
					(promise as RequestPromise<R>).cancel = (promise as RequestPromise<R>).abort = () => {};
				} else {
					this.singlePrev.add(KEY);
					const _promise = this.send<R, P>(fn, rests, config);
					_promise.finally(() => {
						this.singlePrev!.delete(KEY);
					});
					(promise as RequestPromise<R>).cancel = _promise.cancel;
					(promise as RequestPromise<R>).abort = _promise.abort;
					_promise.then(resolve).catch(reject);
				}
				return promise as RequestPromise<R>;
			}
			throw new Error('Unknown single type');
		}
		return this.send<R, P>(fn, rests, config);
	}

	private singleKey(url: string, config: RequestConfig) {
		const { method = Methods.GET } = config;
		const baseURL = (this._axios.defaults.baseURL || '').replace(replaceSuffixSlash, '$1');
		const path = (url || '').replace(replacePrefixSlash, '$1');
		return `//${upperCase(method)}::${baseURL}/${path}`;
	}

	private send<R, P extends any[]>(
		fn: Fn<[...P, config: RequestConfig], Promise<any>>,
		rests: P,
		config: RequestConfigWithAbort = {},
	) {
		const abort = createAbortController(config);
		config.__abort = abort;
		// 添加并行管道执行项
		const _promise = this._pipeline.add(async config => {
			// 执行重试机制
			return await requestWithRetry(fn, rests, config, this._API.domains);
		}, config) as unknown as RequestPromise<R>;
		const { promise, resolve, reject } = createPromise();
		(promise as RequestPromise<R>).abort = (promise as RequestPromise<R>).cancel = () => {
			// 队列移除方法
			_promise.cancel();
			abort();
			reject(new axios.CanceledError('abort request'));
		};
		_promise.then(resolve).catch(reject);
		return promise as RequestPromise<R>;
	}
}
