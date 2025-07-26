import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { Fn } from '@wang-yige/utils';
import type { CustomConfig } from '@/@types/config';

export * from './config';

export type RequestConfig<D = any> = AxiosRequestConfig<D> & CustomConfig & { [K in string]: any };

export type RequestConfigWithAbort = RequestConfig & { __abort?: Fn };

export type InterceptRequestConfig = InternalAxiosRequestConfig<any> & CustomConfig;

export type InterceptResponseConfig = { config: InterceptRequestConfig };

export type AbortPromise<T = any> = Promise<T> & {
	/**
	 * Abort the request.
	 */
	abort: Fn;
	/**
	 * alias of `abort` method.
	 */
	cancel: Fn;
};
