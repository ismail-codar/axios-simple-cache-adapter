// src/adapter.ts
import axios, { getAdapter } from "axios";

// src/cache.ts
import { isObject, isPromise } from "@tool-belt/type-predicates";
import { parse, stringify } from "flatted";
function isStorageLike(storage) {
  return isObject(storage) && Reflect.has(storage, "getItem");
}
function isMapLike(storage) {
  return isObject(storage) && Reflect.has(storage, "delete");
}
var CacheService = class {
  storage;
  constructor(storage) {
    if (storage) {
      this.storage = storage;
    } else {
      this.storage = typeof localStorage === "undefined" ? /* @__PURE__ */ new Map() : localStorage;
    }
  }
  async get(key) {
    const cacheKey = this.cacheKey(key);
    let cached = isStorageLike(this.storage) ? this.storage.getItem(cacheKey) : this.storage.get(cacheKey);
    if (isPromise(cached)) {
      cached = await Promise.resolve(cached);
    }
    if (cached) {
      const { expiration, value } = parse(cached);
      if (!Number.isNaN(Number(expiration)) && Number(expiration) < Date.now()) {
        await this.del(cacheKey);
        return null;
      }
      return value;
    }
    return null;
  }
  async set(key, { config: { headers }, ...response }, ttl) {
    const cacheKey = this.cacheKey(key);
    const value = stringify({
      expiration: Date.now() + ttl,
      value: {
        ...response,
        config: { headers },
        request: {}
      }
    });
    const setItem = isStorageLike(this.storage) ? this.storage.setItem(cacheKey, value) : this.storage.set(cacheKey, value);
    if (isPromise(setItem)) {
      await setItem;
    }
  }
  async del(key) {
    const removeItem = isStorageLike(this.storage) ? this.storage.removeItem(key) : isMapLike(this.storage) ? this.storage.delete(key) : this.storage.del(key);
    if (isPromise(removeItem)) {
      await removeItem;
    }
  }
  cacheKey(key) {
    return `axios-cache::${key}`;
  }
};

// src/ttl.ts
import { isBoolean, isNumber } from "@tool-belt/type-predicates";
import { parse as parse2 } from "cache-control-parser";

// src/constants.ts
var ONE_SECOND_IN_MS = 1e3;

// src/ttl.ts
function parseCacheControlHeader(response = {}) {
  const { headers = {} } = response;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "cache-control") {
      const cacheControl = parse2(value);
      const maxAge = cacheControl["s-maxage"] ?? cacheControl["max-age"];
      if (maxAge) {
        return maxAge * ONE_SECOND_IN_MS;
      }
    }
  }
  return null;
}
function getCacheTTL({
  parseHeaders,
  config,
  response,
  defaultTTL
}) {
  const { cache } = config;
  if (isBoolean(cache)) {
    if (!cache) {
      return null;
    }
    if (defaultTTL) {
      return defaultTTL;
    }
  }
  if (isNumber(cache) && cache > 0) {
    return cache;
  }
  if (parseHeaders) {
    return parseCacheControlHeader(response);
  }
  return null;
}

// src/adapter.ts
function createCacheAdapter({
  debug = false,
  parseHeaders = false,
  logger = console,
  storage,
  defaultTTL
} = {}) {
  const cache = new CacheService(storage);
  const adapter = getAdapter(
    typeof XMLHttpRequest === "undefined" ? "http" : "xhr"
  );
  return async function(config) {
    const isGetRequest = config.method?.toLowerCase() === "get";
    const url = axios.getUri(config);
    const cachedResponse = isGetRequest ? await cache.get(url) : null;
    if (cachedResponse) {
      if (debug) {
        const msg = `[axios-cache] serving cached response for url: ${url}`;
        logger.log(msg);
      }
      return {
        ...cachedResponse,
        config: { ...config, ...cachedResponse.config }
      };
    }
    const response = await adapter(config);
    const ttl = getCacheTTL({
      config,
      defaultTTL,
      parseHeaders,
      response
    });
    if (isGetRequest && ttl) {
      if (debug) {
        const msg = `[axios-cache] caching response for url: ${url} with TTL: ${ttl}`;
        logger.log(msg);
      }
      await cache.set(url, response, ttl);
    }
    return response;
  };
}
export {
  createCacheAdapter
};
