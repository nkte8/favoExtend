import { Redis } from '@upstash/redis/cloudflare'
import { z } from 'zod'
import { ExtendError } from './ExtendError'
import {
    JsonType,
    JsonObj,
    JsonTypeNullAble,
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

    protected verifyParameter<T>(badopts: unknown, use: z.ZodSchema<T>) {
        try {
            return use.parse(badopts)
        } catch (e: unknown) {
            if (e instanceof z.ZodError) {
                throw new ExtendError({
                    message: `${e.name}`,
                    status: 500,
                    name: 'Invalid Opts',
                })
            }
            throw new Error('Unexpected Error at verifyParameter')
        }
    }

    protected verifyKey = async (key?: string) => {
        const invalidKeyPatternRegex = new RegExp(/\/{2,}/)
        if (typeof key !== 'undefined' && invalidKeyPatternRegex.test(key)) {
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

    /** get: Read DB. if value not found, throw error.
     * @param key DB key
     */
    get = async (key: string): Promise<string> => {
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

    /** getUndefinedAble: Read DB. if value not found, return undefined
     * @param key DB key
     */
    getUndefinedAble = async (key: string): Promise<JsonType> => {
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
            throw new Error('Unexpected Error at getUndefinedAble')
        }
    }

    /** set: Write DB as string
     * @param key DB key
     * @param value register DB value
     * @param opts set options
     */
    set = async (
        key: string,
        value: string,
        opts?: JsonObj,
    ): Promise<undefined | string> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = this.verifyParameter(
                opts,
                this.ZodSetCommandOptions,
            )
            const result: string | null = await this.Redis.set(
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
            const verifiedOpts = this.verifyParameter(
                opts,
                z.object({ path: z.string().default('$') }).or(z.undefined()),
            )
            const path: string =
                typeof verifiedOpts?.path !== 'undefined'
                    ? verifiedOpts.path
                    : '$'
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
            const verifiedOpts = this.verifyParameter(
                opts,
                z.object({ path: z.string().default('$') }).or(z.undefined()),
            )
            const path: string =
                typeof verifiedOpts?.path !== 'undefined'
                    ? verifiedOpts.path
                    : '$'
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
            const verifiedOpts = this.verifyParameter(
                opts,
                z.object({ path: z.string().default('$') }).or(z.undefined()),
            )
            const path: string =
                typeof verifiedOpts?.path !== 'undefined'
                    ? verifiedOpts.path
                    : '$'
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
            const verifiedOpts = this.verifyParameter(
                opts,
                z.object({ path: z.string().default('$') }).or(z.undefined()),
            )
            const path: string =
                typeof verifiedOpts?.path !== 'undefined'
                    ? verifiedOpts.path
                    : '$'
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
     * scan: Scan pattern, return key list
     * @param pattern Glob-style pattern.
     */
    scan = async (pattern: string): Promise<string[]> => {
        try {
            this.verifyKey(pattern)
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
            return keys
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
            throw new Error('Unexpected Error at scan')
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
                match: "*",
            })
            console.debug(`DEBUG: regex=${regex}`)
            const selectedKeys = keys.reduce<string[]>((nval, key) => {
                if(RegExp(regex, "g").test(key)) {
                    nval.push(key)
                }
                return nval
            }, [])
            // if no keys found throw error
            if (selectedKeys.length <= 0) {
                throw new ExtendError({
                    message: `No found keypattern: ${regex}`,
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
     * zadd: Add sortedSet
     * @param key key
     * @param values sortedSet
     * @param opts zadd options
     * @returns
     */
    zadd = async (
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
     * zaddArray: Add sortedSets
     * @param key key
     * @param values sortedSet list
     * @param opts zadd options
     * @returns
     */
    zaddArray = async (
        key: string,
        values: JsonType[],
        opts?: JsonObj,
    ): Promise<JsonType | undefined> => {
        try {
            this.verifyKey(key)
            const verifiedOpts = this.verifyParameter(
                opts,
                this.ZodZaddCommandOptions,
            )
            const verifiedValues = this.verifyParameter(
                values,
                this.ZodSortedSet.array(),
            )
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
     * zrem: Remove value from sortedSet
     * @param key key
     * @param values sortedSet list
     * @returns none
     */
    zrem = async (key: string, value: string): Promise<undefined> => {
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
    /**
     * zremArray: Remove value from sortedSets
     * @param key key
     * @param values sortedSet list
     * @returns none
     */
    zremArray = async (key: string, values: JsonType[]): Promise<undefined> => {
        try {
            this.verifyKey(key)
            const verifiedValues = this.verifyParameter(
                values,
                z.string().array(),
            )
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
    zrank = async (key: string, value: string): Promise<number | undefined> => {
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
        value: string,
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
     * @returns sorted list of value
     */
    zrange = async (
        key: string,
        values: JsonObj,
        opts?: JsonObj,
    ): Promise<JsonType> => {
        try {
            this.verifyKey(key)
            const verifiedValues = this.verifyParameter(
                values,
                z.object({
                    min: z.number(),
                    max: z.number(),
                }),
            )
            const verifiedOpts = this.verifyParameter(
                opts,
                this.ZodZRangeCommandOptions,
            )
            // if undefined, will it replaced by default, so never undefined
            const result: JsonType[] = await this.Redis.zrange(
                key,
                verifiedValues.min!,
                verifiedValues.max!,
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
