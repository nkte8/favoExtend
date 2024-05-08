import { Extender } from '@/base/Extender'
import * as defs from './apidefs'
import { ExtendError } from '@/base/ExtendError'
import { Definition } from '@/base/Definition'

export class FavoExtend extends Extender {
    constructor(
        env: {
            UPSTASH_REDIS_REST_URL: string
            UPSTASH_REDIS_REST_TOKEN: string
        },
        additionalDefs?: Definition[],
    ) {
        const Definitions = [
            defs.GetFavo,
            defs.GetUser,
            defs.PostFavoWithAuth,
            defs.PostUserEdit,
            defs.Login,
        ]
        if (additionalDefs !== undefined) {
            Definitions.push(...additionalDefs)
        }
        super(env, Definitions)

        // Register your extend functions
        this.addMethod({
            generateToken: {
                kind: 'keyOnly',
                function: this.generateToken,
            },
        })
    }

    /**
     * Extend example: Generate token
     * @param key db key
     * @param input info for auth
     */
    generateToken = async (key: string): Promise<string> => {
        try {
            // when you define function, recommend validation
            this.verifyKey(key)
            const token = crypto.randomUUID()
            const result: string | null = await this.Redis.set(key, token, {
                ex: 3600 * 24 * 7,
            })
            if (result !== 'OK') {
                throw new ExtendError({
                    message: `Failed to SET value by redis client`,
                    status: 500,
                    name: 'Generate Token Failed',
                })
            }
            return token
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
