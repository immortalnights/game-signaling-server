import { randomUUID } from "node:crypto"

export class Player {
    id: string
    name: string
    ready: boolean

    constructor(id: string | undefined, name: string) {
        this.id = id ?? randomUUID()
        this.name = name
        this.ready = false
    }
}
