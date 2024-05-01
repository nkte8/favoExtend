import { z } from 'zod'
import { ExtendError } from './ExtendError'

type JsonLiteral = boolean | number | string | undefined
type JsonObj = { [key: string]: JsonType }
type JsonType = JsonLiteral | JsonObj | JsonType[]
type KeyValue = { [key: string]: string }

type RelationType = { [key: string]: RelationType } | string

type ApiDef = {
    path: string
    method: string
    input?: z.ZodSchema<JsonType>
    query?: z.ZodSchema<KeyValue>
    output?: RelationType
}
type RedisDef = {
    keyPattern: string
    functionName: string
    input?: RelationType
    output?: z.ZodSchema<JsonType>
    ignoreFail: boolean
    dependFunc?: number[]
    opts?: KeyValue
}

export class Invalid {
    // Use Invalid Status Unique Type
}

type UnRequire<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

class Definition {
    public apiDef: ApiDef
    public dbDefs: RedisDef[]
    constructor(
        apiDef: ApiDef,
        dbDefs: UnRequire<RedisDef, 'keyPattern' | 'ignoreFail'>[],
    ) {
        this.apiDef = apiDef
        const dbdef = dbDefs.map((value) => {
            if (typeof value.keyPattern === 'undefined') {
                value.keyPattern = ''
            }
            if (typeof value.ignoreFail === 'undefined') {
                value.ignoreFail = false
            }
            return value as RedisDef
        })
        this.dbDefs = dbdef
    }

    verifyAPIQuery = (dummy: unknown): Invalid | KeyValue | undefined => {
        const zodObject = this.apiDef.query
        if (typeof zodObject === 'undefined') {
            return dummy === undefined ? undefined : new Invalid()
        }
        const result = this.verifyZod(dummy, zodObject)
        if (typeof result !== 'object' || Array.isArray(result)) {
            throw Error('Unexpected Error')
        }
        return result
    }

    verifyAPIInput = (dummy: unknown): Invalid | JsonType | undefined => {
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

    private verifyZod = (
        dummy: unknown,
        zodObject: z.ZodSchema<JsonType> | undefined,
    ): Invalid | JsonType | undefined => {
        if (typeof zodObject === 'undefined') {
            return dummy === undefined ? undefined : new Invalid()
        }
        if (!zodObject.safeParse(dummy).success) {
            return new Invalid()
        }
        return zodObject.parse(dummy)
    }

    isEnable = ({
        requestPath,
        httpMethod,
    }: {
        requestPath: string
        httpMethod: string
    }): boolean => {
        return (
            requestPath === this.apiDef.path &&
            httpMethod === this.apiDef.method
        )
    }

    private replaceRelationTypeToInputAbleData = async ({
        relationData,
        inputData,
    }: {
        relationData: RelationType
        inputData: JsonType
    }) => {
        const Regex = /{([^{}]*)}/g
        const result: JsonType = {}
        if (typeof relationData === 'string') {
            // relationData ex. input={data}
            const matchedArray = [...relationData.matchAll(Regex)]
            if (matchedArray.length > 1) {
                throw new ExtendError({
                    message: `Invalid relationData definicated: relationData=${relationData}`,
                    status: 500,
                    name: 'Invalid Definition',
                })
            }
            if (matchedArray.length == 0) {
                return relationData
            }

            const refMarker = matchedArray[0][1]
            const refValue = this.getValueFromObjectByRef({
                refMarker,
                searchData: inputData,
            })
            // console.debug(`DEBUG: refMarker=${refMarker}, refValue=${refValue}`)
            return refValue
        }
        Object.keys(relationData).map(async (key) => {
            const currentRelation = relationData[key]
            const searchResult = await this.replaceRelationTypeToInputAbleData({
                relationData: currentRelation,
                inputData,
            })
            result[key] = searchResult
        })
        return result
    }

    apiInputToRedisInput = ({
        inputData,
        relationData,
    }: {
        inputData: JsonType
        relationData: RelationType | undefined
    }) => {
        if (typeof relationData === 'undefined') {
            return
        }
        return this.replaceRelationTypeToInputAbleData({
            relationData: relationData,
            inputData,
        })
    }
    redisOutputToOptsInput = async ({
        inputData,
        opts,
    }: {
        inputData: JsonType
        opts: KeyValue | undefined
    }) => {
        if (typeof opts === 'undefined') {
            return
        }
        const parseResult = await this.replaceRelationTypeToInputAbleData({
            relationData: opts,
            inputData: inputData,
        })
        if (Array.isArray(parseResult) || typeof parseResult !== 'object') {
            throw new ExtendError({
                message: 'opts are KeyValue but parse result some literal',
                status: 500,
                name: 'Unexpected Error',
            })
        }
        const result: KeyValue = {}
        Object.keys(parseResult).forEach((key) => {
            const currentValue = parseResult[key]
            if (typeof currentValue !== 'string') {
                return
            }
            result[key] = currentValue
        })
        return result
    }

    redisOutputsToApiOutput = async ({
        inputDatas,
    }: {
        inputDatas: (JsonType | undefined)[]
    }) => {
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

    getValueFromObjectByRef = ({
        refMarker,
        searchData,
    }: {
        refMarker: string
        searchData: JsonType
    }): JsonType => {
        const refMarkers = refMarker.split('.')
        const currentKey = refMarkers[0]

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
        if (currentKey !== '#') {
            throw new ExtendError({
                message: 'Object exists, but key is not #',
                status: 500,
                name: 'Invalid Request',
            })
        }
        return searchData
    }

    redisKeyPatternToKey = async ({
        apiInput,
        dbKeyPattern,
    }: {
        apiInput: JsonType
        dbKeyPattern: string
    }): Promise<string> => {
        const Regex = /{([^{}]*)}/g
        const matchedArray = [...dbKeyPattern.matchAll(Regex)]

        if (typeof apiInput === 'undefined') {
            return dbKeyPattern
        }
        await Promise.all(
            matchedArray.map((value) => {
                const matchedRef = value[1]
                // Search ref
                const inputData = this.getValueFromObjectByRef({
                    refMarker: matchedRef,
                    searchData: apiInput,
                })
                // if inputData is not defined, not edit dbkeyPattern
                if (typeof inputData === 'undefined') {
                    return
                }
                if (typeof inputData !== 'string') {
                    throw new ExtendError({
                        message:
                            'keyPattern definition seems contain not string ref',
                        status: 500,
                        name: 'Invalid ref definition',
                    })
                }
                dbKeyPattern = dbKeyPattern.replace(
                    `{${matchedRef}}`,
                    inputData,
                )
            }),
        )
        return dbKeyPattern
    }

    verifyRefMarker = (dummyRefMarker: string): boolean => {
        return RegExp(/a/g).test(dummyRefMarker)
    }

    /**
     * create refName from ValidData
     * @param searchData ValidData(key-dict)
     * @param refMarker init refName, default
     * @returns new refName
     */
    createRefFromObject = ({
        searchObject,
        result,
    }: {
        searchObject: JsonObj
        result: string[]
    }) => {
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

export {
    Definition,
    type JsonType,
    type JsonLiteral,
    type JsonObj,
    type KeyValue,
}
