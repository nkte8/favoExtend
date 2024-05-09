import { z } from 'zod'
import { ExtendError } from './ExtendError'

import { JsonType, JsonObj, KeyValue } from './availableTypes'

type RelationType =
    | { [key: string]: RelationType }
    | string
    | number
    | boolean
    | undefined
    | RelationType[]

type ApiDef = {
    path: string
    method: string
    input?: z.ZodSchema<JsonType>
    query?: z.ZodSchema<KeyValue>
    output?: RelationType
}
type RedisDef = {
    keyRef: string
    multiKeysRef: string
    functionName: string
    input?: RelationType
    output?: z.ZodSchema<JsonType>
    ignoreFail: boolean
    ignoreOutput: boolean
    dependFunc?: number[]
    ifRef?: string
    opts?: JsonObj
}

export class Invalid {
    // Use Invalid Status Unique Type
}

type UnRequire<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export class Definition {
    public apiDef: ApiDef
    public dbDefs: RedisDef[]
    /**
     * refMarker regex. Set groupmatch 1 as refName ex: ([^${}]*)
     */
    public refRegex: RegExp = /\${([^${}]*)}/g
    /**
     * Create API Definition
     * @param apiDef set { path, method, input, query, output }
     * @param dbDefs set [{ keyRef, functionName, input, output, ignoreFail, ignoreOutput, dependFunc, opts }]
     */
    constructor(
        apiDef: ApiDef,
        dbDefs: UnRequire<
            RedisDef,
            'keyRef' | 'multiKeysRef' | 'ignoreFail' | 'ignoreOutput'
        >[],
    ) {
        this.apiDef = apiDef
        const dbdef = dbDefs.map((value) => {
            if (typeof value.keyRef === 'undefined') {
                value.keyRef = ''
            }
            if (typeof value.ignoreFail === 'undefined') {
                value.ignoreFail = false
            }
            if (typeof value.ignoreOutput === 'undefined') {
                value.ignoreOutput = false
            }
            if (typeof value.multiKeysRef === 'undefined') {
                value.multiKeysRef = ''
            }
            return value as RedisDef
        })
        this.dbDefs = dbdef
    }

    /**
     * reduceBooleanFromOpt: reduce keys includes literals except string
     * @param opts opts
     * @returns reduce opt keys include not string
     */
    protected reduceNotStringFromOpt(opts: JsonObj): { [key: string]: string } {
        return Object.keys(opts).reduce<{
            [key: string]: string
        }>((nval, key) => {
            const value = opts[key]
            if (typeof value === 'string') {
                nval[key] = value
            }
            return nval
        }, {})
    }

    /**
     * verifyAPIQuery check input API query fulfilled definication
     * @param dummy input
     * @returns If correct retrun query, if not return Invalid
     */
    verifyAPIQuery(dummy: unknown): Invalid | JsonObj | undefined {
        const zodObject = this.apiDef.query
        if (typeof zodObject === 'undefined') {
            return dummy === undefined ? undefined : new Invalid()
        }
        const result = this.verifyZod(dummy, zodObject)
        if (typeof result !== 'object' || Array.isArray(result)) {
            // apiDef must object, if failed, its problem of zod
            throw Error('Unexpected Error')
        }
        return result
    }

    verifyAPIInput(dummy: unknown): Invalid | JsonType | undefined {
        // console.debug(`DEBUG: dummy=${JSON.stringify(dummy)}`)
        const zodObject = this.apiDef.input
        if (typeof zodObject === 'undefined') {
            return dummy === undefined ? undefined : new Invalid()
        }
        return this.verifyZod(dummy, zodObject)
    }

    verifyRedisOutput = (
        dummy: unknown,
        redisDef: RedisDef,
    ): Invalid | JsonType | undefined => {
        return this.verifyZod(dummy, redisDef.output)
    }

    verifyZod<T extends JsonType>(
        dummy: unknown,
        zodObject: z.ZodSchema<T> | undefined,
    ): Invalid | T | undefined {
        if (typeof zodObject === 'undefined') {
            return dummy === undefined ? undefined : new Invalid()
        }
        const safeParsed = zodObject.safeParse(dummy)
        if (!safeParsed.success) {
            return new Invalid()
        }
        return safeParsed.data
    }

    isEnable({
        requestPath,
        httpMethod,
    }: {
        requestPath: string
        httpMethod: string
    }): boolean {
        return (
            requestPath === this.apiDef.path &&
            httpMethod === this.apiDef.method
        )
    }

    private async replaceRelationTypeToInputAbleData({
        relationData,
        inputData,
    }: {
        relationData: RelationType
        inputData: JsonType
    }): Promise<JsonType> {
        // console.debug(`DEBUG: relationData=${JSON.stringify(relationData)}`)
        // console.debug(`DEBUG: inputData=${JSON.stringify(inputData)}`)
        const result: JsonType = {}
        if (typeof relationData === 'string') {
            // relationData ex. input={data}
            const matchedArray = [...relationData.matchAll(this.refRegex)]
            if (matchedArray.length > 1) {
                throw new ExtendError({
                    message: `Invalid relationData definicated: relationData=${relationData}`,
                    status: 500,
                    name: 'Invalid Definition',
                })
            }
            if (matchedArray.length === 0) {
                return relationData
            }
            // console.debug(`DEBUG: inputData=${JSON.stringify(inputData)}`)
            const refMarker = matchedArray[0][1]
            // if no refMaker return
            if (refMarker === '') {
                return relationData
            }
            const refValue = this.getValueFromObjectByRef({
                refMarker,
                searchData: inputData,
            })
            // console.debug(`DEBUG: refMarker=${refMarker}, refValue=${refValue}`)
            return refValue
        }
        if (typeof relationData !== 'object') {
            return relationData
        }
        if (Array.isArray(relationData)) {
            const currentRelation = await Promise.all(
                relationData.map(async (value) => {
                    return await this.replaceRelationTypeToInputAbleData({
                        relationData: value,
                        inputData,
                    })
                }),
            )
            return currentRelation
        }

        Object.keys(relationData).map(async (key) => {
            // console.debug(`DEBUG: key=${key}`)
            const currentRelation = relationData[key]
            const searchResult = await this.replaceRelationTypeToInputAbleData({
                relationData: currentRelation,
                inputData,
            })
            result[key] = searchResult
            // console.debug(`DEBUG: result=${JSON.stringify(result)}`)
        })
        return result
    }

    async ifRefToBoolean({
        inputData,
        ifRef,
    }: {
        inputData: JsonType
        ifRef?: string
    }): Promise<boolean> {
        // console.debug(`DEBUG: inputData=${JSON.stringify(inputData)}`)
        if (typeof ifRef === 'undefined') {
            return true
        }
        const inputAbleData = await this.replaceRelationTypeToInputAbleData({
            relationData: ifRef,
            inputData: inputData,
        })
        // console.debug(`DEBUG: inputAbleData=${JSON.stringify(inputAbleData)}`)

        const result = z.boolean().safeParse(inputAbleData)
        if (result.success !== true) {
            throw new ExtendError({
                message: `${ifRef} seems not include value parse-able by boolean.`,
                status: 500,
                name: 'Invalid Ref',
            })
        }
        return result.data
    }

    apiInputToRedisInput({
        inputData,
        relationData,
    }: {
        inputData: JsonType
        relationData: RelationType | undefined
    }) {
        // console.debug(`DEBUG: inputData=${JSON.stringify(inputData)}`)
        if (typeof relationData === 'undefined') {
            return
        }
        return this.replaceRelationTypeToInputAbleData({
            relationData: relationData,
            inputData: inputData,
        })
    }
    async redisOutputToOptsInput({
        inputData,
        opts,
    }: {
        inputData: JsonType
        opts: JsonObj | undefined
    }) {
        if (typeof opts === 'undefined') {
            return
        }
        const parseResult = await this.replaceRelationTypeToInputAbleData({
            relationData: this.reduceNotStringFromOpt(opts),
            inputData: inputData,
        })
        // console.log(`DEBUG: parseResult=${JSON.stringify(parseResult)}`)
        if (Array.isArray(parseResult) || typeof parseResult !== 'object') {
            throw new ExtendError({
                message: 'opts are KeyValue but parse result some literal',
                status: 500,
                name: 'Unexpected Error',
            })
        }
        return parseResult
    }

    async redisOutputsToApiOutput({
        inputDatas,
    }: {
        inputDatas: (JsonType | undefined)[]
    }) {
        if (inputDatas.length !== this.dbDefs.length) {
            throw new Error('DB result seems not match to definition')
        }
        const apiOutput = this.apiDef.output
        if (typeof apiOutput === 'undefined') {
            return
        }
        const inputData: JsonObj = {}

        // create new input tagged by result
        this.dbDefs.map(async (_, index) => {
            const currentInput = inputDatas[index]
            if (typeof currentInput === 'undefined') {
                return
            }
            inputData[`#${index}`] = currentInput
        })

        const result = await this.replaceRelationTypeToInputAbleData({
            relationData: apiOutput,
            inputData,
        })
        // console.debug("DEBUG: result=" + JSON.stringify(result))
        return result
    }

    getValueFromObjectByRef({
        refMarker,
        searchData,
    }: {
        refMarker: string
        searchData: JsonType
    }): JsonType {
        const refMarkers = refMarker.split('.')
        const currentKey = refMarkers[0]
        // console.debug(`DEBUG: searchData=${JSON.stringify(searchData)}`)
        // console.debug(`DEBUG: refMarker=${refMarker}`)

        // If searchData is JsonObj, return or research
        if (typeof searchData === 'object' && !Array.isArray(searchData)) {
            const currentValue = searchData[currentKey]
            if (refMarkers.length === 1) {
                return currentValue
            }
            refMarkers.shift()
            const currentRef = refMarkers.join('.')
            const result = this.getValueFromObjectByRef({
                refMarker: currentRef,
                searchData: currentValue,
            })
            // console.debug(`DEBUG: Refmarker=${currentRef}, result=${result}`)
            return result
        }

        // If searchData is not string, throw
        if (typeof searchData !== 'string') {
            throw new ExtendError({
                message: 'Ref requested but data is not string',
                status: 500,
                name: 'Invalid Ref Required',
            })
        }
        // If searchData is string, check current ref
        if (refMarkers.length > 1) {
            throw new ExtendError({
                message: `Object don't have such key: ${currentKey}`,
                status: 400,
                name: 'Invalid Request',
            })
        }
        // if (currentKey !== '#') {
        throw new ExtendError({
            // message: 'Object exists, but key is not #',
            message: 'Invalid ref required.',
            status: 500,
            name: 'Invalid Request',
        })
        // }
        // return searchData
    }

    async redisMultiKeyRefToMultiKeys({
        apiInput,
        multiKeysRef,
    }: {
        apiInput: JsonType
        multiKeysRef: string
    }): Promise<string[]> {
        const matchedArray = [...multiKeysRef.matchAll(this.refRegex)]

        if (typeof apiInput === 'undefined') {
            return [multiKeysRef]
        }
        // console.debug(`DEBUG: apiInput=${JSON.stringify(apiInput)}`)
        const replaceResults = await Promise.all(
            matchedArray.map((value) => {
                const matchedRef = value[1]
                // Search ref
                const inputData = this.getValueFromObjectByRef({
                    refMarker: matchedRef,
                    searchData: apiInput,
                })
                // if inputData is not defined, not edit dbKeyRef
                if (typeof inputData === 'undefined') {
                    return
                }
                if (!Array.isArray(inputData)) {
                    throw new ExtendError({
                        message:
                            'multiKeyRef definition must be replaceable to array',
                        status: 500,
                        name: 'Invalid ref definition',
                    })
                }
                // console.debug(`DEBUG: inputData=${JSON.stringify(inputData)}`)
                return inputData
            }),
        )
        // console.debug(`DEBUG: replaceResults=${JSON.stringify(replaceResults)}`)

        const result = replaceResults.reduce((nval: string[], value) => {
            if (Array.isArray(value)) {
                const strFilterResult = value.reduce<string[]>((nnval, val) => {
                    if (typeof val === 'string') {
                        nnval.push(val)
                    }
                    return nnval
                }, [])
                nval = [...nval, ...strFilterResult]
            }
            return nval
        }, [])

        return result
    }

    async rediskeyRefToKey({
        apiInput,
        dbKeyRef,
    }: {
        apiInput: JsonType
        dbKeyRef: string
    }): Promise<string> {
        const matchedArray = [...dbKeyRef.matchAll(this.refRegex)]

        if (typeof apiInput === 'undefined') {
            return dbKeyRef
        }
        // console.debug(
        //     `DEBUG: apiInput=${JSON.stringify(apiInput)}`,
        // )

        await Promise.all(
            matchedArray.map((value) => {
                const matchedRef = value[1]
                // Search ref
                const inputData = this.getValueFromObjectByRef({
                    refMarker: matchedRef,
                    searchData: apiInput,
                })
                // if inputData is not defined, not edit dbKeyRef
                if (typeof inputData === 'undefined') {
                    return
                }
                if (typeof inputData !== 'string') {
                    throw new ExtendError({
                        message:
                            'keyRef definition seems contain not string ref',
                        status: 500,
                        name: 'Invalid ref definition',
                    })
                }
                dbKeyRef = dbKeyRef.replace(value[0], inputData)
                // console.debug(`DEBUG: dbKeyRef=${dbKeyRef}`)
            }),
        )
        return dbKeyRef
    }

    /**
     * create refName from ValidData
     * @param searchData ValidData(key-dict)
     * @param refMarker init refName, default
     * @returns new refName
     */
    createRefFromObject({
        searchObject,
        result,
    }: {
        searchObject: JsonObj
        result: string[]
    }) {
        for (const key of Object.keys(searchObject)) {
            const searchDataValue = searchObject[key]
            if (
                typeof searchDataValue !== 'object' ||
                Array.isArray(searchDataValue)
            ) {
                return key
            } else {
                const mergedRef =
                    key +
                    '.' +
                    this.createRefFromObject({
                        searchObject: searchDataValue,
                        result,
                    })
                result.push(mergedRef)
            }
        }
        return ''
    }
}
