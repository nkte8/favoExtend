import { ExtenderBase } from './ExtenderBase'
import { ExtendError } from './ExtendError'
import { Definition } from './Definition'
import { JsonType, JsonObj } from './availableTypes'
import { z } from 'zod'

export class Extender extends ExtenderBase {
    // protected addMethod(method: typeof this.methods) {
    //     super.addMethod(method)
    // }
    constructor(
        env: {
            UPSTASH_REDIS_REST_URL: string
            UPSTASH_REDIS_REST_TOKEN: string
        },
        additionalDefs?: Definition[],
    ) {
        const Definitions: Definition[] = []
        if (additionalDefs !== undefined) {
            Definitions.push(...additionalDefs)
        }
        super(env, Definitions)
        // Register your extend functions
        this.addMethod({
            objectExtract: {
                kind: 'method',
                function: this.objectExtract,
            },
            arrayReplace: {
                kind: 'method',
                function: this.arrayReplace,
            },
            defineRef: {
                kind: 'anyNokey',
                function: this.defineRef,
            },
        })
    }
    /**
     * arrayReplace: replace array values with regex
     * @param opts.array Array replacement
     * @param opts.regex Regex value
     * @param opts.replace Special replacement patterns:
     *   https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
     * @returns sortedSet of value
     */
    arrayReplace = async (opts?: JsonObj): Promise<JsonType> => {
        try {
            // console.debug(`DEBUG: opts=${JSON.stringify(opts)}`)
            const verifiedOpts = this.verifyParameter(
                opts,
                z.object({
                    array: z.string().array(),
                    regex: z.string(),
                    replace: z.string(),
                }),
            )
            const result = verifiedOpts.array.map((value) =>
                value.replace(
                    new RegExp(verifiedOpts.regex, 'g'),
                    verifiedOpts.replace,
                ),
            )
            // console.debug(`DEBUG: result=${JSON.stringify(result)}`)
            return result
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at arrayMerge')
        }
    }

    /**
     * objectExtract: merge two list to object
     * @param opts Array of object with key
     * @returns merged object array
     */
    objectExtract = async (opts?: JsonObj): Promise<JsonType> => {
        try {
            if (typeof opts === 'undefined') {
                throw new ExtendError({
                    message: `Input object of allay to opts`,
                    status: 500,
                    name: 'Invalid input',
                })
            }
            // verification
            const keys: string[] = Object.keys(opts)
            const inputArrays = keys.map((key) => {
                const input = opts[key]
                if (!Array.isArray(input)) {
                    throw new ExtendError({
                        message: `Opts include not array, error key: ${key}`,
                        status: 500,
                        name: 'Invalid input',
                    })
                }
                return input
            })
            // console.debug(`DEBUG: ${JSON.stringify(inputArrays)}`)
            const length = inputArrays[0].length
            inputArrays.map((value) => {
                if (value.length !== length) {
                    throw new ExtendError({
                        message: `Arrays must same length. correct-len: ${length}, invalid-len: ${value.length}`,
                        status: 500,
                        name: 'Invalid input',
                    })
                }
            })
            const range = (start: number, end: number) =>
                Array.from({ length: end - start + 1 }, (_, k) => k + start)
            const indexs = range(0, length - 1)

            const result = indexs.map((i) => {
                const jsonValue: JsonObj = {}
                keys.map((key, index) => {
                    jsonValue[key] = inputArrays[index][i]
                })
                return jsonValue
            })
            // console.debug(`DEBUG: result=${JSON.stringify(result)}`)
            return result
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at arrayMerge')
        }
    }
    /**
     * defineRef: Define input
     * @param input anyvalue
     * @returns pass through
     */
    defineRef = async (input: JsonType): Promise<JsonType> => {
        try {
            // console.debug(`DEBUG: input=${JSON.stringify(input)}`)
            return input
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at arrayMerge')
        }
    }
}
