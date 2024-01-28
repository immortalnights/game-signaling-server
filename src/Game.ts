import { Opponent } from "./Opponent.js"
import { Player } from "./Player.js"

export class Game {
    host: Player
    id?: string
    name?: string
    options?: object
    players: Opponent[]

    constructor(host: Player, name?: string, options?: object) {
        this.name = name
        this.options = options
        this.host = host
        this.players = []
    }

    addPlayer(player: Opponent) {
        this.players.push(player)
    }

    removePlayer(player: Opponent) {
        const index = this.players.indexOf(player)

        if (index === -1) {
            throw new Error(`Failed to find player ${player}`)
        }

        this.players.splice(index, 1)
    }

    async sendToHost(data: object) {
        return Promise.resolve()
    }

    async sendToPlayers(data: object) {
        return Promise.resolve()
    }
}
