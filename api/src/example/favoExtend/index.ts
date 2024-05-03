import { Extender } from '@/base/Extender'
import * as defs from './apidefs'
import { JsonObj } from '@/base/availableTypes'
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
            auth: {
                kind: 'method',
                function: this.auth,
            },
            generateToken: {
                kind: 'keyOnly',
                function: this.generateToken,
            },
        })
    }

    /**
     * Extend example: Auth function, compare two value
     * @param opts.verifySrc compare value A
     * @param opts.verifyDist compare value B
     */
    auth = async (opts?: JsonObj): Promise<undefined> => {
        try {
            // when you define function, recommend validation

            // console.debug(`DEBUG: opts=${JSON.stringify(opts)}`)
            if (
                typeof opts === 'undefined' ||
                typeof opts['verifySrc'] === 'undefined' ||
                typeof opts['verifyDist'] === 'undefined'
            ) {
                throw new ExtendError({
                    message: 'Invalid Data found in redis',
                    status: 500,
                    name: 'Invalid Data',
                })
            }
            const decodedVerifyPw = opts['verifySrc']
            const decodedSavedPw = opts['verifyDist']
            if (decodedSavedPw !== decodedVerifyPw) {
                throw new ExtendError({
                    message: 'Authentication Failed',
                    status: 400,
                    name: 'Authentication Failed',
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
