import { Extender } from '@/base/Extender'
import * as defs from './apidefs'
import { JsonObj } from '@/base/availableTypes'
import { ExtendError } from '@/base/ExtendError'
import { Definition } from '@/base/Definition'
import { z } from 'zod'

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
                kind: "objectNokey",
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
     * @param input.verifySrc compare value A
     * @param input.verifyDist compare value B
     */
    auth = async (input: JsonObj): Promise<undefined> => {
        try {
            // console.debug(`DEBUG: input=${JSON.stringify(input)}`)
            const verifiedInput = this.verifyParameter(
                input,
                z.object({
                    verifySrc: z.string(),
                    verifyDist: z.string(),
                }),
            )
            const decodedVerifyPw = verifiedInput['verifySrc']
            const decodedSavedPw = verifiedInput['verifyDist']
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
