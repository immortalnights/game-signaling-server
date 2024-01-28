import {
    GameOptions,
    GameRecord,
    PlayerRecord,
} from "../signalingserver/types.js"
import { SignalingServerConnection } from "../signalingserver/SignalingServerConnection.js"
import { ServerMessageHandler } from "../signalingserver/message.js"
import { Player } from "../Player.js"

type RoomMessageType =
    | "room-player-connected"
    | "room-player-disconnected"
    | "room-player-ready-change"
    | "room-start-game"

export class Room {
    ws: SignalingServerConnection
    player: Player
    id: string
    name: string
    host: boolean
    players: PlayerRecord[]
    options: GameOptions

    constructor(
        ws: SignalingServerConnection,
        player: Player,
        host: boolean,
        roomData: GameRecord,
    ) {
        this.ws = ws
        this.player = player
        this.id = roomData.id
        this.name = roomData.name
        this.host = host
        this.players = roomData.players
        this.options = roomData.options

        this.ws.subscribe({
            "room-player-connected": this.handlePlayerConnected,
            "room-player-disconnected": this.handlePlayerDisconnected,
            "room-player-ready-change": this.handlePlayerReadyChange,
            "room-start-game": this.handleStartGame,
        } satisfies Pick<ServerMessageHandler, RoomMessageType>)
    }

    private handlePlayerConnected: ServerMessageHandler["room-player-connected"] =
        ({ id, name, sessionDescription }) => {
            console.assert(
                this.players.length < this.options.maxPlayers,
                "Room has too many players",
            )

            this.players.push({
                id,
                name,
                ready: false,
                sessionDescription,
                host: false,
            })

            if (this.host) {
                if (sessionDescription) {
                    this.player.peerConnection.response(sessionDescription)
                } else {
                    console.error("Player connected without RTC answer")
                }
            }
        }

    private handlePlayerDisconnected: ServerMessageHandler["room-player-disconnected"] =
        ({ id }) => {
            const index = this.players.findIndex((player) => player.id === id)
            if (index !== -1) {
                this.players.splice(index, 1)
            }
        }

    private handlePlayerReadyChange: ServerMessageHandler["room-player-ready-change"] =
        ({ id, ready }) => {
            const player = this.players.find((player) => player.id === id)
            if (player) {
                player.ready = ready
            } else {
                console.error(
                    `Failed to find expected player in room ${name} (${id})`,
                )
            }
        }

    private handleStartGame: ServerMessageHandler["room-start-game"] = () => {}
}
