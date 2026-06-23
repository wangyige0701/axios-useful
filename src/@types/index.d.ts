import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import type { Fn } from '@wang-yige/utils';
import type { ExtraConfig } from '@/@types/config';

export * from './config';

export type RequestConfig<D = any> = AxiosRequestConfig<D> & ExtraConfig & { [K in string]: any };

export type RequestConfigWithAbort = RequestConfig & { __abort?: Fn };

export type InterceptRequestConfig = InternalAxiosRequestConfig<any> & ExtraConfig;

export type InterceptResponseConfig = { config: InterceptRequestConfig };

export type RequestPromise<T = any> = Promise<T> & {
	/**
	 * Abort the request.
	 */
	abort: Fn;
	/**
	 * alias of `abort` method.
	 */
	cancel: Fn;
};

export { ExtraConfig };
