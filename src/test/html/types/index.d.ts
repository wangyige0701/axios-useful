import { APIRequest } from '../../../index';

declare global {
	var $API: {
		APIRequest: typeof APIRequest;
	};
}
