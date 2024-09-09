"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  createCacheAdapter: () => createCacheAdapter
});
module.exports = __toCommonJS(src_exports);

// src/adapter.ts
var import_axios = __toESM(require("axios"));

// src/cache.ts
var import_type_predicates = require("@tool-belt/type-predicates");
var import_flatted = require("flatted");
function isStorageLike(storage) {
  return (0, import_type_predicates.isObject)(storage) && Reflect.has(storage, "getItem");
}
function isMapLike(storage) {
  return (0, import_type_predicates.isObject)(storage) && Reflect.has(storage, "delete");
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
    if ((0, import_type_predicates.isPromise)(cached)) {
      cached = await Promise.resolve(cached);
    }
    if (cached) {
      const { expiration, value } = (0, import_flatted.parse)(cached);
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
    const value = (0, import_flatted.stringify)({
      expiration: Date.now() + ttl,
      value: {
        ...response,
        config: { headers },
        request: {}
      }
    });
    const setItem = isStorageLike(this.storage) ? this.storage.setItem(cacheKey, value) : this.storage.set(cacheKey, value);
    if ((0, import_type_predicates.isPromise)(setItem)) {
      await setItem;
    }
  }
  async del(key) {
    const removeItem = isStorageLike(this.storage) ? this.storage.removeItem(key) : isMapLike(this.storage) ? this.storage.delete(key) : this.storage.del(key);
    if ((0, import_type_predicates.isPromise)(removeItem)) {
      await removeItem;
    }
  }
  cacheKey(key) {
    return `axios-cache::${key}`;
  }
};

// src/ttl.ts
var import_type_predicates2 = require("@tool-belt/type-predicates");
var import_cache_control_parser = require("cache-control-parser");

// src/constants.ts
var ONE_SECOND_IN_MS = 1e3;

// src/ttl.ts
function parseCacheControlHeader(response = {}) {
  const { headers = {} } = response;
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === "cache-control") {
      const cacheControl = (0, import_cache_control_parser.parse)(value);
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
  if ((0, import_type_predicates2.isBoolean)(cache)) {
    if (!cache) {
      return null;
    }
    if (defaultTTL) {
      return defaultTTL;
    }
  }
  if ((0, import_type_predicates2.isNumber)(cache) && cache > 0) {
    return cache;
  }
  if (parseHeaders) {
    return parseCacheControlHeader(response);
  }
  return defaultTTL || null;
}

// src/adapter.ts
function createCacheAdapter({
  debug = false,
  parseHeaders = false,
  logger = console,
  storage,
  defaultTTL,
  methods
} = {}) {
  const cache = new CacheService(storage);
  const adapter = (0, import_axios.getAdapter)(
    typeof XMLHttpRequest === "undefined" ? "http" : "xhr"
  );
  return async function(config) {
    const isCachingRequest = methods && config.method ? methods.includes(config.method?.toLowerCase()) : config.method?.toLowerCase() === "get";
    const url = import_axios.default.getUri(config) + (config.data || "");
    const cachedResponse = isCachingRequest ? await cache.get(url) : null;
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createCacheAdapter
});
