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

    /** incr: incriment DB value.
     * @param key DB key
     * @param value incremental. defalut 1
     */
    incr = async (key: string): Promise<number> => {
        try {
            return await this.Redis.incr(key)
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

    /**
     * incrSum: return increment sum.
     * @param pattern Glob-style pattern.
     */
    incrSum = async (pattern: string): Promise<number> => {
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
    }

    /**
     * incrSumUndefinedAble: return increment sum. if no item found, return undefined
     * @param pattern Glob-style pattern.
     */
    incrSumUndefinedAble = async (
        pattern: string,
    ): Promise<number | undefined> => {
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
    }

    /** get: read DB. if value not found, throw error.
     * @param key DB key
     */
    get = async (key: string): Promise<Omit<JsonType, 'undefined'>> => {
        try {
            const value: JsonType | null = await this.Redis.get(key)
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
            const value: JsonType | null = await this.Redis.get(key)
            if (value === null) {
                return undefined
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

    /** set: write DB as string
     * @param key DB key
     * @param value register DB value
     * @param ttl set second when data disabled
     */
    set = async (key: string, value: string): Promise<undefined> => {
        try {
            const result: string | null = await this.Redis.set(key, value)
            if (result !== 'OK') {
                throw new ExtendError({
                    message: `Failed to SET value by redis client`,
                    status: 500,
                    name: 'Write Failed',
                })
            }
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

    /** jsonGet: read db value of json data
     * @param key DB key
     * @param input register DB value
     * @param opts.path default '$', set get json path
     */
    jsonGet = async (key: string, opts?: KeyValue): Promise<JsonType> => {
        try {
            const path: string =
                typeof opts !== 'undefined' &&
                typeof opts['path'] !== 'undefined'
                    ? opts['path']
                    : '$'
            const result: JsonType | null = await this.Redis.json.get(key, path)
            if (result === null || typeof result === 'undefined') {
                throw new ExtendError({
                    message: `Data not found.`,
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

    /** jsonSet: write db value of json data
     * @param key DB key
     * @param input register DB value
     * @param opts.path default '$', set get json path
     */
    jsonSet = async <T extends JsonObj>(
        key: string,
        input: T,
        opts?: KeyValue,
    ): Promise<undefined> => {
        try {
            const path: string =
                typeof opts !== 'undefined' &&
                typeof opts['path'] !== 'undefined'
                    ? opts['path']
                    : '$'
            const result: string | null = await this.Redis.json.set(
                key,
                path,
                input,
            )
            if (result !== 'OK') {
                throw new ExtendError({
                    message: `Failed to SET value by redis client`,
                    status: 500,
                    name: 'Write Failed',
                })
            }
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
}

export { RedisClient }
