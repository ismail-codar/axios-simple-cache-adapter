import { AxiosResponse, InternalAxiosRequestConfig, AxiosAdapter, AxiosPromise } from 'axios';

interface StorageLikeCache {
    getItem(key: string): string | null;
    removeItem(key: string): any;
    setItem(key: string, value: string): any;
}
interface AsyncStorageLikeCache {
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<any>;
    setItem(key: string, value: string): Promise<any>;
}
interface MapLikeCache {
    delete(key: string): any;
    get(key: string): string | null;
    set(key: string, value: string): void;
}
interface AsyncMapLikeCache {
    delete(key: string): Promise<any>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<any>;
}
interface CacheManagerLikeCache {
    del(key: string): any;
    get(key: string): string | null;
    set(key: string, value: string): void;
}
interface AsyncCacheManagerLikeCache {
    del(key: string): Promise<any>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<any>;
}
type AxiosCacheStorage = StorageLikeCache | AsyncStorageLikeCache | MapLikeCache | AsyncMapLikeCache | CacheManagerLikeCache | AsyncCacheManagerLikeCache;
interface CacheLogger {
    log(message: string): void;
}
interface AxiosCacheOptions {
    debug?: boolean;
    defaultTTL?: number;
    logger?: CacheLogger;
    parseHeaders?: boolean;
    storage?: AxiosCacheStorage;
}
interface AxiosCacheObject {
    expiration: number;
    value: AxiosResponse;
}
interface AxiosCacheRequestConfig extends InternalAxiosRequestConfig {
    cache?: boolean | number;
}
interface AxiosCacheAdapter extends AxiosAdapter {
    (config: AxiosCacheRequestConfig): AxiosPromise;
}

declare function createCacheAdapter({ debug, parseHeaders, logger, storage, defaultTTL, }?: AxiosCacheOptions): AxiosCacheAdapter;

export { type AsyncCacheManagerLikeCache, type AsyncMapLikeCache, type AsyncStorageLikeCache, type AxiosCacheAdapter, type AxiosCacheObject, type AxiosCacheOptions, type AxiosCacheRequestConfig, type AxiosCacheStorage, type CacheLogger, type CacheManagerLikeCache, type MapLikeCache, type StorageLikeCache, createCacheAdapter };
