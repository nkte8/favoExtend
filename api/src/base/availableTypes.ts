export type JsonLiteral = boolean | number | string | undefined
export type JsonType = JsonLiteral | JsonType[] | JsonObj
export type JsonObj = { [key: string]: JsonType }

export type KeyValue = { [key: string]: string }

export type JsonLiteralNullAble = boolean | number | string | null
export type JsonTypeNullAble =
    | JsonLiteralNullAble
    | JsonTypeNullAble[]
    | JsonObjNullAble
export type JsonObjNullAble = { [key: string]: JsonTypeNullAble }
