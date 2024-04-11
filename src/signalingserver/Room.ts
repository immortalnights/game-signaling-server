import { type ServerPlayer } from "./ServerPlayer.js"
import {
    type RTCSessionDescriptionLike,
    type GameOptions,
    type PlayerRecord,
    type RoomRecord,
} from "./types.js"
import { randomUUID } from "node:crypto"
import { deleteItemFromArray, throwError } from "./utilities.js"
import { broadcast } from "./broadcast.js"
import { RoomState } from "./states.js"

export class Room implements RoomRecord {
    id: string
    name: string
    state: RoomState
    options: GameOptions
    players: ServerPlayer[]

    constructor(name: string, options: GameOptions, host: ServerPlayer) {
        this.id = randomUUID()
        this.name = name || `${host.name}'s Game`
        this.state = RoomState.Open
        this.options = options
        this.players = [host]

        host.host = true
        host.room = this.id
    }

    get host(): ServerPlayer {
        return (
            this.players.find((player) => player.host) ??
            throwError(`Failed to find host for room ${this.id}`)
        )
    }

    join(player: ServerPlayer) {
        player.room = this.id
        this.players.push(player)

        broadcast(
            this.players,
            "room-player-connected",
            this.serializePlayer(player),
            [player.id],
        )
    }

    leave(player: ServerPlayer) {
        console.debug(
            `Player '${player.name}' has left room '${this.name}' (${player.host})`,
        )

        const isHost =
            this.players.find((p) => p.id === player.id)?.host ?? false

        deleteItemFromArray(this.players, player)

        player.room = undefined
        player.host = false

        broadcast(this.players, "room-player-disconnected", {
            id: player.id,
        })

        if (isHost || this.players.length === 0) {
            console.debug(`Closing abandoned room '${this.name}'`)
            this.state = RoomState.Closed
            broadcast(this.players, "room-closed", { id: this.id })
        }
    }

    private serializePlayer(player: ServerPlayer): PlayerRecord {
        return {
            id: player.id,
            name: player.name,
            ready: player.ready,
            host: player.host,
        }
    }

    serialize(): RoomRecord {
        return {
            id: this.id,
            name: this.name,
            state: this.state,
            players: this.players.map(this.serializePlayer),
            options: this.options,
        }
    }
}
