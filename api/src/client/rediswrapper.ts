import { Redis } from '@upstash/redis/cloudflare'

/**
 * @param env environment for upstash redis client
 */
class RedisWrapper {
    private client: Redis
    constructor(env: {
        UPSTASH_REDIS_REST_URL: string
        UPSTASH_REDIS_REST_TOKEN: string
    }) {
        this.client = Redis.fromEnv(env)
    }

    /** writeValue
     * @param key DB key
     * @param value register DB value
     * @param ttl set second when data disabled
     */
    protected writeValue = async <T>(
        key: string,
        value: T,
        ttl: number = -1
    ): Promise<void> => {
        try {
            const result: boolean =
                (await this.client.set(key, JSON.stringify(value)),
                { get: true, ex: ttl > 0 ? ttl : undefined }) !== null
            if (result === false) {
                const e = new Error('Failed to set value from redis client')
                e.name = 'RedisExtend::writeJson'
                throw e
            }
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw e
            }
            throw new Error('Unexpected Error')
        }
    }
    /** readValueIfValidated return value or false
     * @param key DB key
     * @param validator check validator result of value
     */
    protected readValueIfValidated = async <T>(
        key: string,
        validator: (value: any) => boolean
    ): Promise<T | false> => {
        const value: T | null = await this.client.get<T>(key)
        if (value === null) {
            return false
        }
        if (!validator(value)) {
            return false
        }
        return value as T
    }

    /** readValue with validation
     * @param key DB key
     * @param validator check validator result of value
     */
    protected readValue = async <T>(
        key: string,
        validator: (value: any) => boolean
    ): Promise<T | null> => {
        try {
            const value: T | null = await this.client.get<T>(key)
            if (value === null) {
                return null
            }
            if (!validator(value)) {
                const e = new Error('Failed to get value from redis client')
                e.name = 'RedisExtend::readValue'
                throw e
            }
            return value as T
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw e
            }
            throw new Error('Unexpected Error')
        }
    }
}

export { RedisWrapper }
