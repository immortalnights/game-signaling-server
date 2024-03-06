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
        this.name = name
        this.state = RoomState.Open
        this.options = options
        this.players = [host]

        host.host = true
        host.room = this.id
    }

    get host(): ServerPlayer {
        return (
            this.players.find((player) => player.host) ??
            throwError("Failed to find host")
        )
    }

    join(player: ServerPlayer, sessionDescription: RTCSessionDescriptionLike) {
        player.room = this.id
        this.players.push(player)

        console.assert(
            sessionDescription,
            `Player ${player.id} did not provide sessionDescription when joining room`,
        )

        broadcast(
            this.players,
            "room-player-connected",
            (target) =>
                this.serializePlayer({
                    ...player,
                    sessionDescription: target.host
                        ? sessionDescription
                        : undefined,
                }),
            [player.id],
        )
    }

    leave(player: ServerPlayer) {
        console.debug(`Player '${player.name}' has left room '${this.name}'`)

        deleteItemFromArray(this.players, player)

        player.room = undefined

        broadcast(this.players, "room-player-disconnected", {
            id: player.id,
        })

        if (this.players.length === 0) {
            console.debug(`Closing empty room '${this.name}'`)
            this.state = RoomState.Closed
        }
    }

    private serializePlayer(player: ServerPlayer): PlayerRecord {
        return {
            id: player.id,
            name: player.name,
            ready: player.ready,
            host: player.host,
            sessionDescription: player.sessionDescription,
            iceCandidates: player.host ? player.iceCandidates : undefined,
        }
    }

    serialize(): RoomRecord {
        const host = this.host

        return {
            id: this.id,
            name: this.name,
            state: this.state,
            players: this.players.map(this.serializePlayer),
            options: this.options,
        }
    }
}
