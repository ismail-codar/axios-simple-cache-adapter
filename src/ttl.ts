import { AXIOS_CACHE, ONE_SECOND_IN_MS } from './constants';
import { AxiosCacheRequestConfig } from './types';
import { AxiosResponse } from 'axios';
import { isBoolean, isNumber } from '@tool-belt/type-predicates';
import { parse } from 'cache-control-parser';

export function parseCacheControlHeader(
    response: AxiosResponse,
): number | null {
    for (const [key, value] of Object.entries(response.headers)) {
        if (key.toLowerCase() === 'cache-control') {
            const cacheControl = parse(value as string);
            const maxAge = cacheControl['s-maxage'] ?? cacheControl['max-age'];
            if (maxAge) {
                return maxAge * ONE_SECOND_IN_MS;
            }
        }
    }
    return null;
}

export function getCacheTTL({
    parseHeaders,
    config,
    response,
    defaultTTL,
}: {
    parseHeaders: boolean;
    config: AxiosCacheRequestConfig;
    response: AxiosResponse;
    defaultTTL?: number;
}): number | null {
    const configTTL = config[AXIOS_CACHE];
    if (isBoolean(configTTL)) {
        if (!configTTL) {
            return null;
        }
        if (defaultTTL) {
            return defaultTTL;
        }
    }
    if (isNumber(configTTL) && configTTL > 0) {
        return configTTL;
    }
    if (parseHeaders) {
        return parseCacheControlHeader(response);
    }
    return null;
}
