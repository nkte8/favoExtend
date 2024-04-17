import { Redis } from '@upstash/redis/cloudflare'
import { z } from 'zod'

/**
 * @param env environment for upstash redis client
 */
class RedisWrapper {
    private client: Redis
    private definition:
        | z.ZodObject<z.ZodRawShape>
        | z.ZodString
        | z.ZodNumber
        | z.ZodArray<z.ZodTypeAny>

    constructor(
        env: {
            UPSTASH_REDIS_REST_URL: string
            UPSTASH_REDIS_REST_TOKEN: string
        },
        definition:
            | z.ZodObject<z.ZodRawShape>
            | z.ZodString
            | z.ZodNumber
            | z.ZodArray<z.ZodTypeAny>
    ) {
        this.client = Redis.fromEnv(env)
        this.definition = definition
    }

    /** validator
     * @param data DB value
     */
    protected validator = (data: z.infer<typeof this.definition>): boolean => {
        return this.definition.safeParse(data).success
    }

    /** read: slow but safe read DB.
     *  if value is not verify from definition, method fail.
     * @param key DB key
     */
    protected read = async (
        key: string
    ): Promise<z.infer<typeof this.definition>> => {
        try {
            const value: z.infer<typeof this.definition> | null =
                await this.client.get<z.infer<typeof this.definition>>(key)
            if (value === null) {
                const e = new Error('Method GET EMPTY data from DB')
                e.name = 'readFailed'
                throw e
            }
            if (this.validator(value) === false) {
                const e = new Error('Failed to validate GET data')
                e.name = 'readFailed'
                throw e
            }
            return value
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw e
            }
            throw new Error('Unexpected Error')
        }
    }
    /** write: slow but safe write DB.
     *  if value is not verify from definition, method fail.
     * @param key DB key
     * @param value register DB value
     * @param ttl set second when data disabled
     */
    protected write = async (
        key: string,
        value: z.infer<typeof this.definition>,
        ttl: number = -1
    ): Promise<void> => {
        try {
            if (this.validator(value) === false) {
                const e = new Error('Failed to validate SET data')
                e.name = 'writeFailed'
                throw e
            }
            const result: string | null = await this.client.set(
                key,
                JSON.stringify(value),
                { ex: ttl }
            )
            if (result !== 'OK') {
                const e = new Error('Failed to SET value by redis client')
                e.name = 'writeFailed'
                throw e
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw e
            }
            throw new Error('Unexpected Error')
        }
    }

    /** incr: fast and safe incriment DB value.
     * if value is not number, method fail
     * @param key DB key
     * @param value incriment value, defalut 1
     */
    protected incrValue = async (
        key: string,
        value: number = 1
    ): Promise<number> => {
        try {
            return await this.client.incrby(key, value)
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw e
            }
            throw new Error('Unexpected Error')
        }
    }
    /**
     * scan: fast scan DB key
     * @param pattern Glob-style pattern.
     */
    protected scan = async (pattern: string): Promise<string[]> => {
        const [_, keys] = await this.client.scan(0, {
            match: pattern,
        })
        return keys
    }
    /**
     * incrSum: slow and safe sum increment datas
     * @param pattern Glob-style pattern.
     */
    protected incrSum = async (keys: string[]): Promise<number> => {
        // if no keys found throw error
        if (keys.length <= 0) {
            const e = new Error('Invalid input for method')
            e.name = 'incrSumFailed'
            throw e
        }
        const values: unknown[] = await this.client.mget(keys)
        const tasksSafeParse = Promise.allSettled(
            values.map((value: unknown) => {
                if (z.number().safeParse(value).success) {
                    return z.number().parse(value)
                } else {
                    throw new Error('Invalid type value')
                }
            })
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
     * scan: slow scan DB key, get
     * @param regexPattern Regex pattern.
     */
    protected regexScan = async (regexPattern: RegExp): Promise<string[]> => {
        // Grob all keys
        const [_, keys] = await this.client.scan(0, { match: '*' })
        return keys.filter(RegExp.prototype.test, regexPattern)
    }
}

export { RedisWrapper }
