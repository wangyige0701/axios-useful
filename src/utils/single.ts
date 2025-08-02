import axios, { type Axios } from 'axios';
import { type Fn, createPromise, upperCase, ParallelTask, isBoolean, isUndef, VOID_FUNCTION } from '@wang-yige/utils';
import type { RequestPromise, RequestConfig, RequestConfigWithAbort } from '@/@types';
import { Methods, SingleType } from './enum';
import { createAbortController } from './abort';
import { requestWithRetry } from './retry';

const replacePrefixSlash = /^\/*([^\/].*)$/;
const replaceSuffixSlash = /^(.*[^\/])\/*$/;

function delayMicroQueue(cb: Fn<[...any[]], any>) {
	Promise.resolve()
		.then(() => {
			return Promise.resolve();
		})
		.then(cb);
}

/**
 * 单例控制器，通过并行管道进行管理
 */
export class SingleController {
	private _axios: Axios;
	private _pipeline: ParallelTask;
	private singleTasks: Map<string, ParallelTask> | undefined;
	private singleNext: Map<string, Fn> | undefined;
	private singlePrev: Set<string> | undefined;

	constructor(axios: Axios, pipeline: ParallelTask) {
		this._axios = axios;
		this._pipeline = pipeline;
	}

	public request<R, P extends any[]>(
		fn: Fn<[...P, config: RequestConfig], Promise<any>>,
		rests: P,
		url: string,
		config: RequestConfigWithAbort,
	): RequestPromise<R> {
		const singleConfig = config.single;
		if (singleConfig || isUndef(singleConfig)) {
			// single 配置默认是 true，没有传则进入此条件分支
			const { type = SingleType.QUEUE } = isBoolean(singleConfig) || isUndef(singleConfig) ? {} : singleConfig;
			const _key = this.singleKey(url, config);
			// Queue 模式，key 相同则进入同一个子队列执行
			if (type === SingleType.QUEUE) {
				const { promise, resolve, reject } = createPromise<R, RequestPromise<R>>();
				if (!this.singleTasks) {
					this.singleTasks = new Map();
				}
				if (!this.singleTasks.has(_key)) {
					this.singleTasks.set(_key, new ParallelTask(1));
					this.singleTasks.get(_key)!.onEmpty(() => {
						this.singleTasks!.delete(_key);
					});
				}
				const tasks = this.singleTasks.get(_key)!;
				const task = async () => {
					await this.send<R, P>(fn, rests, config).then(resolve, reject);
				};
				const useTask = tasks.add(task);
				promise.abort = promise.cancel = () => {
					useTask.cancel();
					config.__abort && config.__abort();
				};
				return promise;
			}
			// Next 模式，前一个请求没有执行完成则会被拒绝，并执行下一个请求
			if (type === SingleType.NEXT) {
				let isAbort = false;
				if (!this.singleNext) {
					this.singleNext = new Map();
				}
				if (this.singleNext.has(_key)) {
					this.singleNext.get(_key)!();
				}
				const _promise = this.send<R, P>(fn, rests, config);
				this.singleNext.set(_key, () => {
					isAbort = true;
					_promise.abort();
				});
				const { promise, resolve, reject } = createPromise<R, RequestPromise<R>>();
				promise.cancel = _promise.cancel;
				promise.abort = _promise.abort;
				_promise.then(resolve).catch(err => {
					if (isAbort) {
						const tip = 'This request has been canceled because of the next request is come.';
						return reject(new axios.CanceledError(tip));
					}
					reject(err);
				});
				_promise.finally(() => this.singleNext!.delete(_key));
				return promise;
			}
			// Prev 模式，前一个请求没有执行完则不会让下一个请求进入队列，下一个请求的 promise 会被拒绝并返回 axios CanceledError
			if (type === SingleType.PREV) {
				if (!this.singlePrev) {
					this.singlePrev = new Set();
				}
				const { promise, resolve, reject } = createPromise<R, RequestPromise<R>>();
				if (this.singlePrev.has(_key)) {
					promise.cancel = promise.abort = VOID_FUNCTION;
					Promise.resolve().then(() => {
						const tip =
							'This request has been canceled because of the previous request has not been completed.';
						reject(new axios.CanceledError(tip));
					});
				} else {
					this.singlePrev.add(_key);
					const _promise = this.send<R, P>(fn, rests, config);
					promise.cancel = _promise.cancel;
					promise.abort = _promise.abort;
					_promise.then(resolve, reject);
					_promise.finally(() => this.singlePrev!.delete(_key));
				}
				return promise;
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
			return await requestWithRetry(fn, rests, config);
		}, config);
		const { promise, resolve, reject } = createPromise<R, RequestPromise<R>>();
		promise.abort = promise.cancel = () => {
			// 队列移除方法
			_promise.cancel();
			abort();
			// 两次微队列延迟，避免此处 reject 在 abort 产生的拒绝状态之前执行
			delayMicroQueue(() => {
				// 避免请求未进入队列，直接被取消，就抛出一个 axios CanceldError 拒绝状态
				reject(new axios.CanceledError('Abort request before send'));
			});
		};
		_promise.then(resolve, reject);
		return promise;
	}
}
