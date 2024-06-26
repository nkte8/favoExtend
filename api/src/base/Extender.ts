import { ExtenderBase } from './ExtenderBase'
import { ExtendError } from './ExtendError'
import { Definition } from './Definition'
import { JsonType, JsonObj, JsonLiteral } from './availableTypes'
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
                kind: 'objectNokey',
                function: this.objectExtract,
            },
            arrayReplace: {
                kind: 'objectNokey',
                function: this.arrayReplace,
            },
            nowUnixTime: {
                kind: 'method',
                function: this.nowUnixTime,
            },
            defineRef: {
                kind: 'anyNokey',
                function: this.defineRef,
            },
            numSum: {
                kind: 'arrayNokey',
                function: this.numSum,
            },
            numAvg: {
                kind: 'arrayNokey',
                function: this.numAvg,
            },
            numCompare: {
                kind: 'arrayNokey',
                function: this.numCompare,
            },
            numConv: {
                kind: 'literalNokey',
                function: this.numConv,
            },
            boolConv: {
                kind: 'literalNokey',
                function: this.boolConv,
            },
            throwError: {
                kind: 'literalNokey',
                function: this.throwError,
            },
            isSame: {
                kind: 'arrayNokey',
                function: this.isSame,
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
    arrayReplace = async (input: JsonObj): Promise<JsonType> => {
        try {
            // console.debug(`DEBUG: opts=${JSON.stringify(opts)}`)
            const verifiedOpts = z
                .object({
                    array: z.string().array(),
                    regex: z.string(),
                    replace: z.string(),
                })
                .parse(input)
            const result = verifiedOpts.array.map((value) => {
                const replaced = value.replace(
                    new RegExp(verifiedOpts.regex, 'g'),
                    verifiedOpts.replace,
                )
                // console.debug(`DEBUG: replaced=${JSON.stringify(replaced)}`)
                return replaced
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
            throw new Error('Unexpected Error at arrayReplace')
        }
    }
    /**
     * nowUnixTime: Output unix time of server
     * @param opts.tdiff set time difference(hour)
     * @returns return unixtime(number, unixtime(second))
     */
    nowUnixTime = async (opts?: JsonObj): Promise<number> => {
        try {
            const verifiedOpts = z
                .object({
                    tdiff: z.number().default(0),
                })
                .optional()
                .parse(opts)
            const tdiff =
                typeof verifiedOpts !== 'undefined' ? verifiedOpts.tdiff : 0
            return Date.now() / 1000 + tdiff * 3600
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at nowUnixTime')
        }
    }
    /**
     * objectExtract: merge two list to object
     * @param opts Array of object with key
     * @returns merged object array
     */
    objectExtract = async (input: JsonObj): Promise<JsonType> => {
        try {
            if (typeof input === 'undefined') {
                throw new ExtendError({
                    message: `Input object of allay to opts`,
                    status: 500,
                    name: 'Invalid input',
                })
            }
            // verification
            const keys: string[] = Object.keys(input)
            const inputArrays = keys.map((key) => {
                const value = input[key]
                if (!Array.isArray(value)) {
                    throw new ExtendError({
                        message: `Opts include not array, error key: ${key}`,
                        status: 500,
                        name: 'Invalid input',
                    })
                }
                return value
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
            throw new Error('Unexpected Error at objectExtract')
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
            throw new Error('Unexpected Error at defineRef')
        }
    }
    /**
     * throwError: throw error if input is true
     * @param input boolean
     * @param opts.name error name
     * @param opts.message error message
     * @param opts.status error status.
     */
    throwError = async (
        input: JsonLiteral,
        opts?: JsonObj,
    ): Promise<undefined> => {
        try {
            // console.debug(`DEBUG: input=${JSON.stringify(input)}`)
            // console.debug(`DEBUG: opts=${JSON.stringify(opts)}`)
            const verifiedInput = z.boolean().parse(input)
            const verifiedOpts = z
                .object({
                    name: z.string().default('Invalid Error'),
                    message: z.string().default('API Invalid Error'),
                    status: z.number().default(500),
                    reverse: z.boolean().default(false),
                })
                .default({
                    name: 'Invalid Error',
                    message: 'API Invalid Error',
                    status: 500,
                    reverse: false,
                })
                .parse(opts)
            if (verifiedInput === !verifiedOpts.reverse) {
                throw new ExtendError({
                    message: verifiedOpts.message,
                    status: verifiedOpts.status,
                    name: verifiedOpts.name,
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
            throw new Error('Unexpected Error at throwError')
        }
    }
    /**
     * boolConv: convert value to boolean
     * @param input literal
     * @param opts.reverse change true to false, false to true
     * @returns if parse success, return value. when not, return undefined
     */
    boolConv = async (
        input: JsonLiteral,
        opts?: JsonObj,
    ): Promise<boolean | undefined> => {
        try {
            const verifiedOpts = z
                .object({
                    reverse: z.boolean().default(false),
                })
                .default({
                    reverse: false,
                })
                .parse(opts)
            // console.debug(`DEBUG: input=${JSON.stringify(input)}`)
            const parseResult = z.coerce.boolean().safeParse(input)
            if (!parseResult.success) {
                return undefined
            }
            let result = parseResult.data
            if (verifiedOpts.reverse) {
                result = !result
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
            throw new Error('Unexpected Error at boolConv')
        }
    }

    /**
     * numConv: convert value to number
     * @param input literal
     * @param opts.reverse change positive to negative, negative to positive
     * @param opts.abs change to absolute value
     * @returns if parse success, return value. when not, return undefined
     */
    numConv = async (input: JsonLiteral, opts?: JsonObj): Promise<JsonType> => {
        try {
            const verifiedOpts = z
                .object({
                    reverse: z.boolean().default(false),
                    abs: z.boolean().default(false),
                })
                .default({
                    reverse: false,
                    abs: false,
                })
                .parse(opts)
            // console.debug(`DEBUG: input=${JSON.stringify(input)}`)
            const parseResult = z.coerce.number().safeParse(input)
            if (!parseResult.success) {
                return undefined
            }
            let result = parseResult.data
            if (verifiedOpts.abs) {
                result = Math.abs(result)
            }
            if (verifiedOpts.reverse) {
                result *= -1
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
            throw new Error('Unexpected Error at numConv')
        }
    }
    /**
     * numberSum: get sum. string data parse to number, if cannot, skip
     * @param values array of number
     * @returns pass through
     */
    numSum = async (values: JsonType[]): Promise<JsonType> => {
        try {
            const tasksSafeParse = Promise.all(
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
            return result.reduce<number>((a, x) => {
                if (typeof x !== 'undefined') {
                    return a + x
                }
                return a
            }, 0)
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at numSum')
        }
    }

    /**
     * numberSum: get average. string data parse to number, if cannot, skip
     * @param values array of number
     * @returns pass through
     */
    numAvg = async (values: JsonType[]): Promise<JsonType> => {
        try {
            const tasksSafeParse = Promise.all(
                values.map((value: unknown) => {
                    const safeParsed = z.number().safeParse(value)
                    if (safeParsed.success) {
                        return safeParsed.data
                    } else {
                        return undefined
                    }
                }),
            )
            let lenght = 0
            const result = (await tasksSafeParse).reduce<number>((a, x) => {
                if (typeof x !== 'undefined') {
                    lenght += 1
                    return a + x
                }
                return a
            }, 0)
            if (lenght === 0) {
                throw new ExtendError({
                    message: `Available key not found`,
                    status: 400,
                    name: 'Bad Input',
                })
            }
            return result / lenght
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at numAvg')
        }
    }

    /**
     * numCompare: Compare values with rule selected
     * @param values array of number, 1sh one is compared by other numbers
     * @param opts.operator select from eq ne ge gt le lt
     * @returns evaluate by operator
     */
    numCompare = async (
        values: JsonType[],
        opts?: JsonObj,
    ): Promise<boolean> => {
        try {
            const tasksSafeParse = Promise.all(
                values.map((value: unknown) => {
                    const safeParsed = z.number().safeParse(value)
                    if (safeParsed.success) {
                        return safeParsed.data
                    } else {
                        return undefined
                    }
                }),
            )
            const verifiedOpts = z
                .object({
                    operator: z
                        .literal('eq')
                        .or(z.literal('ne'))
                        .or(z.literal('ge'))
                        .or(z.literal('gt'))
                        .or(z.literal('le'))
                        .or(z.literal('lt')),
                })
                .default({ operator: 'eq' })
                .parse(opts)
            const taskResult = await tasksSafeParse
            const compareValue = taskResult.shift()
            if (taskResult.length < 1 || compareValue === undefined) {
                return false
            }
            const result = taskResult.reduce<boolean>((a, x) => {
                if (a || x === undefined) {
                    // when it true or x invalid, return true
                    return a
                }
                switch (verifiedOpts.operator) {
                    case 'eq': {
                        a = compareValue === x
                        break
                    }
                    case 'ne': {
                        a = compareValue !== x
                        break
                    }
                    case 'ge': {
                        a = compareValue >= x
                        break
                    }
                    case 'gt': {
                        a = compareValue > x
                        break
                    }
                    case 'le': {
                        a = compareValue <= x
                        break
                    }
                    case 'lt': {
                        a = compareValue < x
                        break
                    }
                }
                return a
            }, false)
            return result
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at numCompare')
        }
    }
    /**
     * isSame: compare array all
     * @param input anyvalue
     * @param opts.notAll if flug true, it become to return true when contain first item same at least from array.
     * @returns if the array values all same to first, return true. when some item is not same return false. if array.length < 2, false
     */
    isSame = async (input: JsonType[], opts?: JsonObj): Promise<boolean> => {
        try {
            // console.debug(`DEBUG: input=${JSON.stringify(input)}`)
            const compareValue = input.shift()
            if (input.length < 1) {
                return false
            }
            const verifiedOpts = z
                .object({
                    notAll: z.boolean().default(false),
                })
                .default({ notAll: false })
                .parse(opts)
            // when notAll=false, return false when not matched.
            // wehn notAll=true, return true when some value matched.
            const initializer = !verifiedOpts.notAll
            const result = input.reduce<boolean>((a, x) => {
                if (initializer ? compareValue !== x : compareValue === x) {
                    a = !initializer
                }
                return a
            }, initializer)
            return result
        } catch (e: unknown) {
            if (e instanceof Error) {
                throw new ExtendError({
                    message: e.message,
                    status: 500,
                    name: e.name,
                })
            }
            throw new Error('Unexpected Error at isAllSame')
        }
    }
}
