import axios, { AxiosResponse, getAdapter } from 'axios';

import { CacheService } from './cache';
import { getCacheTTL } from './ttl';
import {
    AxiosCacheAdapter,
    AxiosCacheOptions,
    AxiosCacheRequestConfig,
} from './types';

export function createCacheAdapter({
    debug = false,
    parseHeaders = false,
    logger = console,
    storage,
    defaultTTL,
    methods,
}: AxiosCacheOptions = {}): AxiosCacheAdapter {
    const cache = new CacheService(storage);
    const adapter = getAdapter(
        typeof XMLHttpRequest === 'undefined' ? 'http' : 'xhr',
    );

    return async function (
        config: AxiosCacheRequestConfig,
    ): Promise<AxiosResponse> {
        const isCachingRequest =
            methods && config.method
                ? methods.includes(config.method?.toLowerCase())
                : config.method?.toLowerCase() === 'get';
        const url = axios.getUri(config) + (config.data || '');

        const cachedResponse = isCachingRequest ? await cache.get(url) : null;
        if (cachedResponse) {
            if (debug) {
                const msg = `[axios-cache] serving cached response for url: ${url}`;
                logger.log(msg);
            }
            return {
                ...cachedResponse,
                config: { ...config, ...cachedResponse.config },
            };
        }

        const response = await adapter(config);

        const ttl = getCacheTTL({
            config,
            defaultTTL,
            parseHeaders,
            response,
        });

        if (isCachingRequest && ttl) {
            if (debug) {
                const msg = `[axios-cache] caching response for url: ${url} with TTL: ${ttl}`;
                logger.log(msg);
            }
            await cache.set(url, response, ttl);
        }

        return response;
    };
}
