import { RedisClient } from './RedisClient'
import { ExtendError } from './ExtendError'
import { JsonType, JsonObj, JsonLiteral } from './availableTypes'
import { z } from 'zod'

export class RedisExtend extends RedisClient {
    constructor(env: {
        UPSTASH_REDIS_REST_URL: string
        UPSTASH_REDIS_REST_TOKEN: string
    }) {
        super(env)
    }
    /** get: Read DB. if value not found, throw error.
     * @param key DB key
     */
    getThrowError = async (key: string): Promise<string> => {
        try {
            this.verifyKey(key)
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
            throw new Error('Unexpected Error at get')
        }
    }
    /**
     * scanRegex: Scan pattern, return key list
     * @param regex regex pattern.
     */
    scanRegex = async (regex: string): Promise<string[]> => {
        try {
            // search pattern
            const [_, keys] = await this.Redis.scan(0, {
                match: '*',
            })
            console.debug(`DEBUG: regex=${regex}`)
            const selectedKeys = keys.reduce<string[]>((nval, key) => {
                if (RegExp(regex, 'g').test(key)) {
                    nval.push(key)
                }
                return nval
            }, [])
            // if no keys found throw error
            if (selectedKeys.length <= 0) {
                throw new ExtendError({
                    message: `No found keyRef: ${regex}`,
                    status: 500,
                    name: 'KeyScan Failed',
                })
            }
            return selectedKeys
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
            throw new Error('Unexpected Error at scanRegex')
        }
    }
    /**
     * incrSum: Return increment sum.
     * @param pattern Glob-style pattern.
     */
    incrSum = async (pattern: string): Promise<number | undefined> => {
        try {
            this.verifyKey(pattern)
            // search pattern
            const [_, keys] = await this.Redis.scan(0, {
                match: pattern,
            })
            console.debug(`DEBUG: pattern=${pattern} keys=${keys}`)
            // if no keys found, return init value
            if (keys.length <= 0) {
                return undefined
            }
            const values: unknown[] = await this.Redis.mget(keys)
            const tasksSafeParse = Promise.allSettled(
                values.map((value: unknown) => {
                    const safeParsed = z.number().safeParse(value)
                    if (safeParsed.success) {
                        return safeParsed.data
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
                }
                return a
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
            throw new Error('Unexpected Error at incrSum')
        }
    }
    /**
     * typeGrep: Scan pattern, return key list
     * @param opts.keys
     * @param opts.type
     */
    typeGrep = async (opts?: JsonObj): Promise<string[]> => {
        try {
            const verifiedOpts = this.verifyParameter(
                opts,
                z.object({
                    keys: z.string().array(),
                    type: this.ZodType,
                }),
            )
            const result: string[] = []
            await Promise.all(
                verifiedOpts.keys.map(async (key) => {
                    const currentType = await this.Redis.type(key)
                    if (currentType === verifiedOpts.type) {
                        result.push(key)
                    }
                }),
            )
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
            throw new Error('Unexpected Error at typeGrep')
        }
    }
    /**
     * zaddSingle: Add sortedSet
     * @param key key
     * @param values sortedSet
     * @param opts zadd options
     * @returns
     */
    zaddSingle = async (
        key: string,
        values: JsonType,
        opts?: JsonObj,
    ): Promise<JsonType | undefined> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = this.verifyParameter(
                opts,
                this.ZodZaddCommandOptions,
            )
            const verifiedValue = this.verifyParameter(
                values,
                this.ZodSortedSet,
            )
            let result: null | number | undefined
            if (typeof verifiedValue === 'undefined') {
                return
            }
            if (verifiedOpts !== undefined) {
                result = await this.Redis.zadd(key, verifiedOpts, verifiedValue)
            } else {
                result = await this.Redis.zadd(key, verifiedValue)
            }

            result = result !== null ? result : undefined
            if (verifiedOpts?.incr === true) {
                return result
            }
            return
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
            throw new Error('Unexpected Error at zadd')
        }
    }
    /**
     * zremSingle: Remove value from sortedSet
     * @param key key
     * @param values sortedSet list
     * @returns none
     */
    zremSingle = async (
        key: string,
        value: JsonLiteral,
    ): Promise<undefined> => {
        try {
            this.verifyKey(key)
            await this.Redis.zrem(key, value)
            return
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
            throw new Error('Unexpected Error at zrem')
        }
    }
}
