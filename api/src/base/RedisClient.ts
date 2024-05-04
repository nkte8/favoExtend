import { Redis } from '@upstash/redis/cloudflare'
import { z } from 'zod'
import { ExtendError } from './ExtendError'
import {
    JsonType,
    JsonObj,
    JsonTypeNullAble,
    JsonLiteral,
    // OptValue,
} from './availableTypes'

export class RedisClient {
    // Redis directry client
    protected Redis: Redis
    constructor(env: {
        UPSTASH_REDIS_REST_URL: string
        UPSTASH_REDIS_REST_TOKEN: string
    }) {
        this.Redis = Redis.fromEnv(env)
    }

    protected replaceNullToUndefined(
        input: JsonTypeNullAble | Exclude<JsonTypeNullAble | undefined, 'null'>,
    ): JsonType {
        if (input === null) {
            return undefined
        }
        if (Array.isArray(input)) {
            const x = input.map((value) => (value !== null ? value : undefined))
            return x.map((value) => this.replaceNullToUndefined(value))
        }
        if (typeof input !== 'object') {
            return input
        }
        const result: JsonObj = {}
        Object.keys(input).map((key) => {
            result[key] = this.replaceNullToUndefined(input[key])
        })
        return result
    }
    protected verifyKey = async (key?: string) => {
        const invalidkeyRefRegex = new RegExp(/\/{2,}/)
        if (typeof key !== 'undefined' && invalidkeyRefRegex.test(key)) {
            throw new ExtendError({
                message: `Invalid Key assigneed, ${key}`,
                status: 500,
                name: 'Invalid Key',
            })
        }
        return
    }
    /** del: Delete DB key.
     * @param key DB key
     */
    del = async (key: string): Promise<undefined> => {
        try {
            this.verifyKey(key)
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
            throw new Error('Unexpected Error at del')
        }
    }
    /** incr: incriment DB value.
     * @param key DB key
     * @param value incremental. defalut 1
     */
    incr = async (key: string): Promise<number> => {
        try {
            this.verifyKey(key)
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
            throw new Error('Unexpected Error at incr')
        }
    }
    /** mget: Read DB. if value not found, throw error.
     * @param key DB keys
     */
    mget = async (key: string[]): Promise<string[]> => {
        try {
            const value: (string | null)[] = await this.Redis.mget(key)
            const result = value.reduce<string[]>((nval, value) => {
                if (value !== null) {
                    nval.push(value)
                }
                return nval
            }, [])
            if (result.length === 0) {
                throw new ExtendError({
                    message: `Data not found.`,
                    status: 404,
                    name: 'Not Found',
                })
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
            throw new Error('Unexpected Error at mget')
        }
    }
    /** get: Read DB. if value not found, return undefined
     * @param key DB key
     */
    get = async (key: string): Promise<JsonType> => {
        try {
            this.verifyKey(key)
            const value: string | null = await this.Redis.get(key)
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
            throw new Error('Unexpected Error at get')
        }
    }
    /** set: Write DB as string
     * @param key DB key
     * @param value register DB value
     * @param opts set options
     */
    set = async (
        key: string,
        value: JsonLiteral,
        opts?: JsonObj,
    ): Promise<undefined | JsonLiteral> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = this.ZodSetCommandOptions.parse(opts)
            const result: JsonLiteral | null = await this.Redis.set(
                key,
                value,
                verifiedOpts,
            )
            // if get option true, allow return undefined
            if (verifiedOpts?.get === true) {
                return result !== null ? result : undefined
            }
            // if get option false or undefined, result shoud be OK
            if (result !== 'OK') {
                throw new ExtendError({
                    message: `Failed to SET value by redis client`,
                    status: 500,
                    name: 'Write Failed',
                })
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
            throw new Error('Unexpected Error at set')
        }
    }
    /** jsonGet: Read db value of json data
     * @param key DB key
     * @param opts.path default '$', set get json path
     */
    jsonGet = async (key: string, opts?: JsonObj): Promise<JsonType> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = z
                .object({ path: z.string().default('$') })
                .or(z.undefined())
                .parse(opts)
            const path: string =
                typeof verifiedOpts !== 'undefined' ? verifiedOpts.path : '$'
            const result: JsonTypeNullAble = await this.Redis.json.get(
                key,
                path,
            )
            if (result === null || typeof result === 'undefined') {
                throw new ExtendError({
                    message: `Data not found error`,
                    status: 404,
                    name: 'Not Found',
                })
            }
            const parsedResult = this.replaceNullToUndefined(result)
            // console.debug(`DEBUG: result=${JSON.stringify(result)}`)
            // console.debug(`DEBUG: parsedResult=${JSON.stringify(parsedResult)}`)

            // If result length = 1, return as single
            if (Array.isArray(parsedResult) && parsedResult.length === 1) {
                const value = parsedResult[0]
                return value !== null ? value : undefined
            }
            return parsedResult
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
            throw new Error('Unexpected Error at jsonGet')
        }
    }
    /** jsonMget: Read db values of json data
     * @param keys DB keys
     * @param opts.path default '$', set get json path
     */
    jsonMget = async (keys: string[], opts?: JsonObj): Promise<JsonType> => {
        try {
            const verifiedOpts = z
                .object({ path: z.string().default('$') })
                .or(z.undefined())
                .parse(opts)
            const path: string =
                typeof verifiedOpts !== 'undefined' ? verifiedOpts.path : '$'
            const mgetResult: JsonTypeNullAble = await this.Redis.json.mget(
                keys,
                path,
            )
            if (mgetResult === null || typeof mgetResult === 'undefined') {
                throw new ExtendError({
                    message: `Data not found error`,
                    status: 404,
                    name: 'Not Found',
                })
            }
            const parsedResult = this.replaceNullToUndefined(mgetResult)
            // console.debug(`DEBUG: result=${JSON.stringify(result)}`)
            // console.debug(`DEBUG: parsedResult=${JSON.stringify(parsedResult)}`)

            if (!Array.isArray(parsedResult)) {
                // mgetResult must be Array
                throw new Error('Unexpected Error')
            }
            // If result length = 1, return as single
            const result: JsonType[] = parsedResult.map((json) => {
                if (Array.isArray(json) && json.length === 1) {
                    return json[0]
                }
                return json
            })
            // console.debug(`DEBUG: result=${JSON.stringify(result)}`)
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
            throw new Error('Unexpected Error at jsonGet')
        }
    }
    /** jsonSet: Write db value of json data
     * @param key DB key
     * @param input register DB value
     * @param opts.path default '$', set get json path
     */
    jsonSet = async <T extends JsonObj>(
        key: string,
        value: T,
        opts?: JsonObj,
    ): Promise<undefined> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = z
                .object({ path: z.string().default('$') })
                .or(z.undefined())
                .parse(opts)
            const path: string =
                typeof verifiedOpts !== 'undefined' ? verifiedOpts.path : '$'
            // const registerValue = this.replaceUndefinedToNull(value)
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
            throw new Error('Unexpected Error at jsonSet')
        }
    }
    /** jsonDel: Delete db value of json data
     * @param key DB key
     * @param opts.path default '$', set get json path
     */
    jsonDel = async (key: string, opts?: JsonObj): Promise<undefined> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = z
                .object({ path: z.string().default('$') })
                .or(z.undefined())
                .parse(opts)
            const path: string =
                typeof verifiedOpts !== 'undefined' ? verifiedOpts.path : '$'
            const result = await this.Redis.json.del(key, path)
            if (result === 0) {
                throw new ExtendError({
                    message: `No json data deleted`,
                    status: 400,
                    name: 'Not deleted',
                })
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
            throw new Error('Unexpected Error at jsonDel')
        }
    }
    /**
     * zadd: Add sortedSets
     * @param key key
     * @param values sortedSet list
     * @param opts zadd options
     * @returns
     */
    zadd = async (
        key: string,
        values: JsonType[],
        opts?: JsonObj,
    ): Promise<JsonType | undefined> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = this.ZodZaddCommandOptions.parse(opts)
            const verifiedValues = this.ZodSortedSet.array().parse(values)
            let result: null | number | undefined
            const verifiedFirst = verifiedValues.shift()
            if (typeof verifiedFirst === 'undefined') {
                return
            }
            if (verifiedOpts !== undefined) {
                result = await this.Redis.zadd(
                    key,
                    verifiedOpts,
                    verifiedFirst,
                    ...verifiedValues,
                )
            } else {
                result = await this.Redis.zadd(
                    key,
                    verifiedFirst,
                    ...verifiedValues,
                )
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
            throw new Error('Unexpected Error at zaddArray')
        }
    }
    /**
     * zrem: Remove value from sortedSets
     * @param key key
     * @param values sortedSet list
     * @returns none
     */
    zrem = async (key: string, values: JsonType[]): Promise<undefined> => {
        try {
            this.verifyKey(key)
            const verifiedValues = z.string().array().parse(values)
            await this.Redis.zrem(key, verifiedValues)
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
    /**
     * zrank: Return rank of item, sorted low to high
     * @param key key
     * @param values sortedSet item name
     * @returns rank number
     */
    zrank = async (
        key: string,
        value: JsonLiteral,
    ): Promise<number | undefined> => {
        try {
            this.verifyKey(key)
            const result = await this.Redis.zrank(key, value)
            return result !== null ? result : undefined
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
            throw new Error('Unexpected Error at zremArray')
        }
    }
    /**
     * zrevrank: Return rank of item, sorted high to low
     * @param key key
     * @param values sortedSet item name
     * @returns rank number
     */
    zrevrank = async (
        key: string,
        value: JsonLiteral,
    ): Promise<number | undefined> => {
        try {
            this.verifyKey(key)
            const result = await this.Redis.zrevrank(key, value)
            return result !== null ? result : undefined
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
            throw new Error('Unexpected Error at zrevrank')
        }
    }

    /**
     * zrank: Return list with ACS by score
     * @param key key
     * @param input.min start index
     * @param input.max end index
     * @returns sortedSet of value
     */
    zrange = async (
        key: string,
        values: JsonObj,
        opts?: JsonObj,
    ): Promise<JsonType> => {
        try {
            this.verifyKey(key)
            const verifiedValues = z
                .object({
                    min: z.number(),
                    max: z.number(),
                })
                .parse(values)
            const verifiedOpts = this.ZodZRangeCommandOptions.parse(opts)
            const result: JsonType[] = await this.Redis.zrange(
                key,
                verifiedValues.min,
                verifiedValues.max,
                verifiedOpts,
            )
            return result !== null ? result : undefined
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
            throw new Error('Unexpected Error at zrange')
        }
    }

    protected ZodNXAndXXOptions = z
        .object({
            nx: z.literal(true),
            xx: z.never().optional(),
        })
        .or(
            z.object({
                nx: z.never().optional(),
                xx: z.literal(true),
            }),
        )
        .or(
            z.object({
                xx: z.never().optional(),
                nx: z.never().optional(),
            }),
        )
    protected ZodLTAndGTOptions = z
        .object({
            lt: z.literal(true),
            gt: z.never().optional(),
        })
        .or(
            z.object({
                lt: z.literal(true),
                gt: z.never().optional(),
            }),
        )
        .or(
            z.object({
                lt: z.never().optional(),
                gt: z.never().optional(),
            }),
        )

    protected ZodSetCommandOptions = z
        .object({ get: z.boolean().optional() })
        .and(
            z
                .object({
                    ex: z.number(),
                    px: z.never().optional(),
                    exat: z.never().optional(),
                    pxat: z.never().optional(),
                    keepTtl: z.never().optional(),
                })
                .or(
                    z.object({
                        ex: z.never().optional(),
                        px: z.number(),
                        exat: z.never().optional(),
                        pxat: z.never().optional(),
                        keepTtl: z.never().optional(),
                    }),
                )
                .or(
                    z.object({
                        ex: z.never().optional(),
                        px: z.never().optional(),
                        exat: z.number(),
                        pxat: z.never().optional(),
                        keepTtl: z.never().optional(),
                    }),
                )
                .or(
                    z.object({
                        ex: z.never().optional(),
                        px: z.never().optional(),
                        exat: z.never().optional(),
                        pxat: z.number(),
                        keepTtl: z.never().optional(),
                    }),
                )
                .or(
                    z.object({
                        ex: z.never().optional(),
                        px: z.never().optional(),
                        exat: z.never().optional(),
                        pxat: z.never().optional(),
                        keepTtl: z.literal(true),
                    }),
                )
                .or(
                    z.object({
                        ex: z.never().optional(),
                        px: z.never().optional(),
                        exat: z.never().optional(),
                        pxat: z.never().optional(),
                        keepTtl: z.never().optional(),
                    }),
                ),
        )
        .and(this.ZodNXAndXXOptions)
        .optional()
    protected ZodZaddCommandOptions = this.ZodNXAndXXOptions.and(
        this.ZodLTAndGTOptions,
    )
        .and(
            z.object({
                ch: z.literal(true).optional(),
            }),
        )
        .and(
            z.object({
                incr: z.literal(true).optional(),
            }),
        )
        .optional()
    protected ZodSortedSet = z.object({
        score: z.number(),
        member: z.string(),
    })
    protected ZodZRangeCommandOptions = z
        .object({
            withScores: z.boolean().optional(),
            rev: z.boolean().optional(),
        })
        .and(
            z
                .object({
                    byScore: z.literal(true),
                    byLex: z.never().optional(),
                })
                .or(
                    z.object({
                        byScore: z.never().optional(),
                        byLex: z.literal(true),
                    }),
                )
                .or(
                    z.object({
                        byScore: z.never().optional(),
                        byLex: z.never().optional(),
                    }),
                ),
        )
        .and(
            z
                .object({
                    offset: z.number(),
                    count: z.number(),
                })
                .or(
                    z.object({
                        offset: z.never().optional(),
                        count: z.never().optional(),
                    }),
                ),
        )
        .optional()

    protected ZodType = z
        .literal('string')
        .or(z.literal('set'))
        .or(z.literal('list'))
        .or(z.literal('zset'))
        .or(z.literal('hash'))
        .or(z.literal('none'))
        .or(z.literal('json'))
}
