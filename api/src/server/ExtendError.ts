export class ExtendError extends Error {
    public status: number
    constructor({
        message,
        status,
        name,
    }: {
        message: string
        status: number
        name?: string
    }) {
        // favoDB: value
        super(message)
        this.status = status
        if (typeof name !== 'undefined') {
            this.name = name
        }
    }
}
