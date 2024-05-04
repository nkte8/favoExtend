import { RedisClient } from './RedisClient'
import { ExtendError } from './ExtendError'
import {
    JsonType,
    JsonObj,
    JsonLiteral,
    JsonTypeNullAble,
} from './availableTypes'
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
    /** jsonGet: Read db value of json data
     * @param key DB key
     * @param opts.path default '$', set get json path
     */
    jsonGetThrowError = async (
        key: string,
        opts?: JsonObj,
    ): Promise<JsonType> => {
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
            // console.debug(`DEBUG: result=${JSON.stringify(result)}`)
            let parsedResult = this.replaceNullToUndefined(result)
            // console.debug(`DEBUG: parsedResult=${JSON.stringify(parsedResult)}`)
            // If result length = 1, return as single
            if (Array.isArray(parsedResult) && parsedResult.length === 1) {
                parsedResult = parsedResult[0]
            }
            if (typeof parsedResult === "undefined") {
                throw new ExtendError({
                    message: `Data not found error`,
                    status: 404,
                    name: 'Not Found',
                })
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
    /**
     * scanAll: Scan pattern while cursor become 0, return key list
     * @param pattern Glob-style pattern.
     */
    scanAll = async (pattern: string): Promise<string[]> => {
        try {
            this.verifyKey(pattern)
            // search pattern
            let cursor: number = 0
            let resultKeys: string[] = []
            do {
                const [ncursor, keys] = await this.Redis.scan(cursor, {
                    match: pattern,
                })
                resultKeys = resultKeys.concat(keys)
                cursor = ncursor
            } while (cursor !== 0)
            // if no keys found throw error
            if (resultKeys.length <= 0) {
                throw new ExtendError({
                    message: `No found keyRef: ${pattern}`,
                    status: 500,
                    name: 'KeyScan Failed',
                })
            }
            return resultKeys
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
            // before scan, replace regex to wildcard by best effort
            const wildcardPattern = regex
                .replace(RegExp(/(\^|\(\?<=)(.*)/), '$2')
                .replace(RegExp(/\)/), '')
                .replace(RegExp(/[.{$([\\].*/), '*')
            // console.debug(`DEBUG wildcardPattern=${wildcardPattern}`)
            // search pattern
            const resultKeys = await this.scanAll(wildcardPattern)
            // console.debug(`DEBUG: regex=${regex}`)
            const selectedKeys = resultKeys.reduce<string[]>((nval, key) => {
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
            // console.debug(`DEBUG: pattern=${pattern} keys=${keys}`)
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
     * incrSumMultiKeys: Return increment sum.
     * @param keys keyPattern array
     */
    incrSumMultiKeys = async (keys: string[]): Promise<JsonType[]> => {
        try {
            const result = await Promise.all(
                keys.map(async (key) => {
                    const count = await this.incrSum(key)
                    if (typeof count === 'undefined') {
                        return 0
                    }
                    return count
                }),
            )
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
            throw new Error('Unexpected Error at incrSumMultiKeys')
        }
    }

    /**
     * typeGrep: Scan pattern, return key list
     * @param input.keys
     * @param input.type
     */
    typeGrep = async (input: JsonObj): Promise<string[]> => {
        try {
            const verifiedOpts = z
                .object({
                    keys: z.string().array(),
                    type: this.ZodType,
                })
                .parse(input)
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
            const verifiedOpts = this.ZodZaddCommandOptions.parse(opts)
            const verifiedValue = this.ZodSortedSet.parse(values)
            let result: null | number | undefined
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
    /** jsonSetSafe: Write db value of json data, not replace json path(append or refresh).
     * @param key DB key
     * @param input append or refresh key-value
     * @param opts.path default '$', set get json path
     */
    jsonSetSafe = async <T extends JsonObj>(
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
            const results = await Promise.all(
                Object.keys(value).map(async (jkey) => {
                    const currentValue = z
                        .string()
                        .or(z.number())
                        .or(z.boolean())
                        .or(z.record(z.any()))
                        .or(
                            z
                                .string()
                                .or(z.number())
                                .or(z.boolean())
                                .or(z.record(z.any()))
                                .array(),
                        )
                        .parse(value[jkey])
                    return await this.Redis.json.set(
                        key,
                        `${path}.${jkey}`,
                        currentValue,
                    )
                }),
            )
            if (results.includes(null)) {
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
}
