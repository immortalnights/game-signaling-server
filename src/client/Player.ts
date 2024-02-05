export class Player {
    id: string | undefined
    name: string
    ready: boolean
    host: boolean

    constructor(id: string | undefined, name: string) {
        this.id = id
        this.name = name
        this.ready = false
        this.host = false
    }
}
