## axios-useful

Expand for axios, add some useful features like retry, cache, etc.

### Usage

```typescript
import { AxiosRequest } from 'axios-useful';

const API = new AxiosRequest('https://example.com');

const api = (i: number) => {
	return API.get('/todos/' + i);
};

api(0); // result promise with abort method, and it alias for cancel method.
```

### Config

```typescript
const API = new AxiosRequest('/', {
	/**
	 * The maximum number of requests sent at the same time.
	 * - default `5`
	 */
	maximumInOneTime: number,
	/**
	 * The limit number of requests sent in one second, if exceed, it will throw an axios CanceledError.
	 * If pass in zero or negative, it will not have any restrictions set.
	 * - default `50`
	 */
	limitInOneSecond: number,
});
```

### Feature

#### Cache

-   only support GET method

```typescript
API.get('/todos/0', {
    /**
	 * Cache the `Get` request response.
	 * - default `false`
	 */
	cache?: boolean | {
		/**
		 * Cache time in miliseconds.
		 * If time is zero, it will not be cached.
		 * If time is negative, it will not clear cache.
		 * - default `-1`
		 */
		time?: number;
	};
});
```

#### Retry

```typescript
type CodeRange = { from: number; to: number };

type RetryCodeRange = number | number[] | CodeRange | Array<CodeRange> | string;

API.get('/todos/0', {
	/**
	 * Retry the request if failed.
	 * - default `false`
	 */
    retry: boolean | {
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
});
```

#### Single

```typescript
API.get('/todos/0', {
    /**
	 * The same url request is only single at a time.
	 * Not include the params.
	 * - default `true`
	 */
	single?: boolean | {
		/**
		 * The type for single request.
		 * - default is `SingleType.QUEUE`
		 */
		type?: SingleType;
	},
});
```
