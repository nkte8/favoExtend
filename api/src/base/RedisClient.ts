import { Redis } from '@upstash/redis/cloudflare'
import { z } from 'zod'
import { JsonObj, JsonType, KeyValue } from './Definition'
import { ExtendError } from './ExtendError'

class RedisClient {
    // Redis directry client
    protected Redis: Redis
    constructor(env: {
        UPSTASH_REDIS_REST_URL: string
        UPSTASH_REDIS_REST_TOKEN: string
    }) {
        this.Redis = Redis.fromEnv(env)
    }

    protected inputsValidation = <T>({
        key,
        // value,
        // opts,
    }: {
        key?: string
        value?: T
        opts?: KeyValue
    }): void => {
        const invalidKeyPatternRegex = new RegExp(/\/{2,}/)
        if (typeof key !== 'undefined' && invalidKeyPatternRegex.test(key)) {
            throw new ExtendError({
                message: `Invalid Key assigneed, ${key}`,
                status: 500,
                name: 'Invalid Key',
            })
        }
    }

    /** del: delete DB key.
     * @param key DB key
     */
    del = async (key: string): Promise<undefined> => {
        try {
            this.inputsValidation({ key })
            await this.Redis.del(key)
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /** incr: incriment DB value.
     * @param key DB key
     * @param value incremental. defalut 1
     */
    incr = async (key: string): Promise<number> => {
        try {
            this.inputsValidation({ key })
            return await this.Redis.incr(key)
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /**
     * incrSum: return increment sum.
     * @param pattern Glob-style pattern.
     */
    incrSum = async (pattern: string): Promise<number> => {
        try {
            this.inputsValidation({ key: pattern })
            // search pattern
            const [_, keys] = await this.Redis.scan(0, {
                match: pattern,
            })
            // if no keys found throw error
            if (keys.length <= 0) {
                throw new ExtendError({
                    message: `No found keypattern: ${pattern}`,
                    status: 500,
                    name: 'KeyScan Failed',
                })
            }
            const values: unknown[] = await this.Redis.mget(keys)
            const tasksSafeParse = Promise.allSettled(
                values.map((value: unknown, index) => {
                    if (z.number().safeParse(value).success) {
                        return z.number().parse(value)
                    } else {
                        throw new ExtendError({
                            message: `${keys[index]} is not number`,
                            status: 500,
                            name: 'incrSum Failed',
                        })
                    }
                }),
            )
            const result = await tasksSafeParse
            return result.reduce((a, x) => {
                if (x.status === 'fulfilled') {
                    return a + x.value
                } else {
                    return a
                }
            }, 0)
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /**
     * incrSumUndefinedAble: return increment sum. if no item found, return undefined
     * @param pattern Glob-style pattern.
     */
    incrSumUndefinedAble = async (
        pattern: string,
    ): Promise<number | undefined> => {
        try {
            this.inputsValidation({ key: pattern })
            // search pattern
            const [_, keys] = await this.Redis.scan(0, {
                match: pattern,
            })
            // if no keys found, return init value
            if (keys.length <= 0) {
                return undefined
            }
            const values: unknown[] = await this.Redis.mget(keys)
            const tasksSafeParse = Promise.allSettled(
                values.map((value: unknown) => {
                    if (z.number().safeParse(value).success) {
                        return z.number().parse(value)
                    } else {
                        return undefined
                    }
                }),
            )
            const result = await tasksSafeParse
            return result.reduce((a, x) => {
                if (
                    x.status === 'fulfilled' &&
                    typeof x.value !== 'undefined'
                ) {
                    return a + x.value
                } else {
                    return a
                }
            }, 0)
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /** get: read DB. if value not found, throw error.
     * @param key DB key
     */
    get = async (key: string): Promise<string> => {
        try {
            this.inputsValidation({ key })
            const value: string | null = await this.Redis.get(key)
            if (value === null || typeof value === 'undefined') {
                throw new ExtendError({
                    message: `Data not found.`,
                    status: 404,
                    name: 'Not Found',
                })
            }
            return value
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /** getUndefinedAble: read DB. if value not found, return undefined
     * @param key DB key
     */
    getUndefinedAble = async (key: string): Promise<JsonType> => {
        try {
            this.inputsValidation({ key })
            const value: JsonType | null = await this.Redis.get(key)
            if (value === null) {
                return undefined
            }
            return value
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /** set: write DB as string
     * @param key DB key
     * @param value register DB value
     * @param ttl set second when data disabled
     */
    set = async (key: string, value: string): Promise<undefined> => {
        try {
            this.inputsValidation({ key, value })
            const result: string | null = await this.Redis.set(key, value)
            if (result !== 'OK') {
                throw new ExtendError({
                    message: `Failed to SET value by redis client`,
                    status: 500,
                    name: 'Write Failed',
                })
            }
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /** jsonGet: read db value of json data
     * @param key DB key
     * @param input register DB value
     * @param opts.path default '$', set get json path
     */
    jsonGet = async (key: string, opts?: KeyValue): Promise<JsonType> => {
        try {
            this.inputsValidation({ key, opts })
            const path: string =
                typeof opts !== 'undefined' &&
                typeof opts['path'] !== 'undefined'
                    ? opts['path']
                    : '$'
            const result: JsonType | null = await this.Redis.json.get(key, path)
            if (result === null || typeof result === 'undefined') {
                throw new ExtendError({
                    message: `Data not found error`,
                    status: 404,
                    name: 'Not Found',
                })
            }
            // If result length = 1, return as single
            if (Array.isArray(result) && result.length === 1) {
                return result[0]
            }
            return result
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }

    /** jsonSet: write db value of json data
     * @param key DB key
     * @param input register DB value
     * @param opts.path default '$', set get json path
     */
    jsonSet = async <T extends JsonObj>(
        key: string,
        value: T,
        opts?: KeyValue,
    ): Promise<undefined> => {
        try {
            this.inputsValidation({ key, value, opts })
            const path: string =
                typeof opts !== 'undefined' &&
                typeof opts['path'] !== 'undefined'
                    ? opts['path']
                    : '$'
            const result: string | null = await this.Redis.json.set(
                key,
                path,
                value,
            )
            if (result !== 'OK') {
                throw new ExtendError({
                    message: `Failed to SET value by redis client`,
                    status: 500,
                    name: 'Write Failed',
                })
            }
        } catch (e: unknown) {
            if (e instanceof ExtendError) {
                throw e
            } else if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error')
        }
    }
}

export { RedisClient }
