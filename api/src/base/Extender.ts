import { Definition, Invalid, JsonObj, JsonType, KeyValue } from './Definition'
import { RedisClient } from './RedisClient'
import { ExtendError } from './ExtendError'

export class Ignored {
    // Use Ignored Status Unique Type
}

export class Extender extends RedisClient {
    private Definitions: Definition[]
    constructor(
        env: {
            UPSTASH_REDIS_REST_URL: string
            UPSTASH_REDIS_REST_TOKEN: string
        },
        Definitions: Definition[],
    ) {
        super(env)
        this.Definitions = Definitions
    }

    /**
     *
     * @param httpMethod request httpMethod ex. GET, POST
     * @param requestUrl request URL object
     * @param input request Body object
     */
    public apiResult = async ({
        httpMethod,
        requestUrl,
        input,
    }: {
        httpMethod: string
        requestUrl: URL
        input?: JsonType
    }): Promise<JsonType | undefined> => {
        // Search Definicator match requested
        const resultSearchDefinicators = await Promise.all(
            this.Definitions.map((def) => {
                if (
                    def.isEnable({
                        requestPath: requestUrl.pathname,
                        httpMethod,
                    })
                ) {
                    return def
                }
            }),
        )
        // Select enable Definicators
        const selectedDefinicators = resultSearchDefinicators.filter(
            (value) => typeof value !== 'undefined',
        )
        if (
            selectedDefinicators.length !== 1 ||
            typeof selectedDefinicators[0] === 'undefined'
        ) {
            throw new ExtendError({
                message: 'Invalid method requested',
                name: 'Invalid Request',
                status: 400,
            })
        }
        // Unique Definicate
        const Definicator: Definition = selectedDefinicators[0]
        // console.debug(`DEBUG: Definicator defined`)

        const entries = Array.from(
            new Set(new URL(requestUrl).searchParams.entries()),
        )
        // Check Request Input by API definication require
        const dummyQuery =
            entries.length >= 1 ? Object.fromEntries(entries) : undefined

        const requestQuery = Definicator.verifyAPIQuery(dummyQuery)
        const requestBody = Definicator.verifyAPIInput(input)
        if (requestBody instanceof Invalid || requestQuery instanceof Invalid) {
            throw new ExtendError({
                message: 'Request coitains invalid inputs',
                name: 'Invalid Request',
                status: 400,
            })
        }
        let requestInput: JsonObj = {}
        if (typeof requestQuery !== 'undefined') {
            requestInput = { ...requestInput, ...requestQuery }
        }
        if (typeof requestBody === 'object' && !Array.isArray(requestBody)) {
            requestInput = { ...requestInput, ...requestBody }
        }

        const definicatorRunResult: (JsonType | undefined | Ignored)[] = []
        // process by order
        for (let index = 0; index < Definicator.dbDefs.length; index++) {
            const dbDef = Definicator.dbDefs[index]
            const dbInput = await Promise.all([
                Definicator.redisKeyPatternToKey({
                    apiInput: requestInput,
                    dbKeyPattern: dbDef.keyPattern,
                }),
                Definicator.apiInputToRedisInput({
                    inputData: requestInput,
                    relationData: dbDef.input,
                }),
                Definicator.redisOutputToOptsInput({
                    inputData: requestInput,
                    opts: dbDef.opts,
                }),
            ])
            // if keyPattern is left, process skip
            const keyPatternVerify = [...dbInput[0].matchAll(/{([^{}]*)}/g)]
            if (keyPatternVerify.length > 0) {
                if (dbDef.ignoreFail === true) {
                    // console.debug(`DEBUG: #${index} ignored. keyPattern invalid`)
                    definicatorRunResult.push(new Ignored())
                    continue
                }
                throw new ExtendError({
                    message:
                        'keyPattern definition seems contain undefined parameter',
                    status: 500,
                    name: 'Invalid ref definition',
                })
            }

            const dbFunctionKeypattern = dbInput[0]
            const dbFunctionInput = dbInput[1]
            const dbFunctionOpts = dbInput[2]
            // console.debug(
            //     `DEBUG: keyPattern={${dbFunctionKeypattern}}, input={${JSON.stringify(
            //         dbFunctionInput,
            //     )}}, opts=${JSON.stringify(dbFunctionOpts)}`,
            // )

            let dummyResult: JsonType | undefined
            const apiDefinedMethod = this.methods[dbDef.functionName]

            if (
                apiDefinedMethod.kind !== 'methodOnly' &&
                dbFunctionKeypattern === ''
            ) {
                if (dbDef.ignoreFail === true) {
                    // console.debug(`DEBUG: #${index} ignored. keyPattern undefined`)
                    definicatorRunResult.push(new Ignored())
                    continue
                }
                throw new ExtendError({
                    message: 'keyPattern seems empty string',
                    name: 'Invalid Definition',
                    status: 500,
                })
            }
            if (typeof dbDef.dependFunc !== 'undefined') {
                let isContainIgnored: boolean = false
                for (const value of dbDef.dependFunc) {
                    if (definicatorRunResult[value] instanceof Ignored) {
                        isContainIgnored = true
                        break
                    }
                }
                if (isContainIgnored) {
                    if (dbDef.ignoreFail === true) {
                        // console.debug(
                        //     `DEBUG: #${index} ignored. dependencies failed`,
                        // )
                        definicatorRunResult.push(new Ignored())
                        continue
                    }
                    throw new ExtendError({
                        message: 'Process canceled by dependency',
                        name: 'Process Canceled',
                        status: 500,
                    })
                }
            }

            try {
                switch (apiDefinedMethod.kind) {
                    case 'methodOnly': {
                        dummyResult =
                            await apiDefinedMethod.function(dbFunctionOpts)
                        break
                    }
                    case 'keyOnly': {
                        dummyResult = await apiDefinedMethod.function(
                            dbFunctionKeypattern,
                            dbFunctionOpts,
                        )
                        break
                    }
                    case 'keyStr': {
                        if (typeof dbFunctionInput !== 'string') {
                            throw new ExtendError({
                                message: 'Undefined input requested',
                                name: 'Unexpected Request',
                                status: 500,
                            })
                        }
                        dummyResult = await apiDefinedMethod.function(
                            dbFunctionKeypattern,
                            dbFunctionInput,
                            dbFunctionOpts,
                        )
                        break
                    }
                    case 'keyObj': {
                        if (
                            typeof dbFunctionInput !== 'object' ||
                            Array.isArray(dbFunctionInput)
                        ) {
                            throw new ExtendError({
                                message: 'Undefined input requested',
                                name: 'Unexpected Request',
                                status: 500,
                            })
                        }
                        dummyResult = await apiDefinedMethod.function(
                            dbFunctionKeypattern,
                            dbFunctionInput,
                            dbFunctionOpts,
                        )
                        break
                    }
                    default: {
                        throw new ExtendError({
                            message: 'Undefined Function kind requested',
                            name: 'Unexpected Request',
                            status: 500,
                        })
                    }
                }
                // console.debug(`DEBUG: dummyResult=${JSON.stringify(dummyResult)}`)
            } catch (e: unknown) {
                if (dbDef.ignoreFail === true) {
                    // console.debug(`DEBUG: #${index} ignored. Method Error`)
                    definicatorRunResult.push(new Ignored())
                    continue
                }
                let ex = new ExtendError({
                    message: 'Unexpected Error',
                    status: 500,
                })
                if (e instanceof ExtendError) {
                    ex = e
                } else if (e instanceof Error) {
                    ex.name = e.name
                    ex.message = e.message
                }
                throw ex
            }
            // console.debug(`DEBUG: dummyResult=${JSON.stringify(dummyResult)}`)
            const dbMethodResult = Definicator.verifyRedisOutput(
                dummyResult,
                dbDef,
            )
            // if output is not
            if (dbMethodResult instanceof Invalid) {
                if (dbDef.ignoreFail === true) {
                    // console.debug(`DEBUG: #${index} ignored. Output invalid`)
                    definicatorRunResult.push(new Ignored())
                    continue
                }
                throw new ExtendError({
                    message:
                        'Request accepted but Invalid Data response from DB',
                    name: 'Invalid Data',
                    status: 500,
                })
            }
            definicatorRunResult.push(dbMethodResult)
            // Add requestInput to before API result
            requestInput[`#${index}`] = dbMethodResult
        }
        // Ignored function replace undefined
        const replacedResults = definicatorRunResult.map((value) => {
            if (value instanceof Ignored) {
                return undefined
            }
            return value
        })

        return await Definicator.redisOutputsToApiOutput({
            inputDatas: replacedResults,
        })
    }

    public createResponse = async (
        request: Request,
        headers: HeadersInit,
    ): Promise<Response> => {
        let response: Response = undefined!

        try {
            // if Content-type not json, error
            if (
                request.headers.get('Content-Type')?.includes('json') !== true
            ) {
                throw new ExtendError({
                    message: 'Invalid Content-type Request received',
                    status: 400,
                    name: 'Invalid Request',
                })
            }
            // console.debug(`DEBUG: Request received`)
            const requestInputRaw = await request.text()
            const requestInput =
                requestInputRaw !== '' ? JSON.parse(requestInputRaw) : undefined
            const apiResult = await this.apiResult({
                httpMethod: request.method,
                requestUrl: new URL(request.url),
                input: requestInput,
            })
            response = new Response(JSON.stringify(apiResult), {
                status: 200,
                headers,
            })
            // Check method
        } catch (e: unknown) {
            let ex: ExtendError = new ExtendError({
                message: 'Unexpected Error. e is unknown',
                status: 500,
                name: 'Unexpected Error',
            })
            if (e instanceof ExtendError) {
                ex = e
            } else if (e instanceof Error) {
                ex = new ExtendError({
                    message: e.message,
                    name: e.name,
                    status: 500,
                })
            }
            console.error(
                `ERROR: ${JSON.stringify({
                    error: ex.name,
                    message: ex.message,
                    status: ex.status,
                })}`,
            )
            if (ex.status >= 500 && ex.status < 600) {
                ex.name = 'Server Error'
                ex.message = 'Unexpected Server Error'
            }
            response = new Response(
                JSON.stringify({
                    error: ex.name,
                    message: ex.message,
                }),
                { status: ex.status, headers },
            )
        }
        if (typeof response === 'undefined') {
            response = new Response(undefined, {
                status: 500,
                headers,
            })
        }
        return response
    }

    protected methods: {
        [x: string]:
            | {
                  kind: 'methodOnly'
                  function: (opts?: KeyValue) => Promise<JsonType>
              }
            | {
                  kind: 'keyOnly'
                  function: (key: string, opts?: KeyValue) => Promise<JsonType>
              }
            | {
                  kind: 'keyStr'
                  function: (
                      key: string,
                      str: string,
                      opts?: KeyValue,
                  ) => Promise<JsonType>
              }
            | {
                  kind: 'keyObj'
                  function: <T extends JsonObj>(
                      key: string,
                      data: T,
                      opts?: KeyValue,
                  ) => Promise<JsonType>
              }
    } = {
        del: {
            kind: 'keyOnly',
            function: this.del,
        },
        incr: {
            kind: 'keyOnly',
            function: this.incr,
        },
        incrSum: {
            kind: 'keyOnly',
            function: this.incrSum,
        },
        incrSumUndefinedAble: {
            kind: 'keyOnly',
            function: this.incrSumUndefinedAble,
        },
        get: {
            kind: 'keyOnly',
            function: this.get,
        },
        getUndefinedAble: {
            kind: 'keyOnly',
            function: this.getUndefinedAble,
        },
        set: {
            kind: 'keyStr',
            function: this.set,
        },
        jsonGet: {
            kind: 'keyOnly',
            function: this.jsonGet,
        },
        jsonSet: {
            kind: 'keyObj',
            function: this.jsonSet,
        },
    }

    protected addMethod = (method: typeof this.methods) => {
        this.methods = { ...this.methods, ...method }
    }
}
