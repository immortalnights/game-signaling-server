import {
    GameOptions,
    RoomRecord,
    PlayerRecord,
    RoomState,
} from "../signalingserver/types.js"
import { SignalingServerConnection } from "../signalingserver/SignalingServerConnection.js"
import { ServerMessageHandler } from "../signalingserver/message.js"
import { LocalPlayer } from "../LocalPlayer.js"
import { Player } from "../Player.js"
import { RemotePlayer } from "../RemotePlayer.js"

type RoomMessageType =
    | "room-player-connected"
    | "room-player-disconnected"
    | "room-player-ready-change"
    | "room-start-game"

export class Room {
    ws: SignalingServerConnection
    id: string
    name: string
    state: RoomState
    player: LocalPlayer
    // Is the local player the host
    host: boolean
    // Every player in the room
    players: Player[]
    options: GameOptions

    constructor(
        ws: SignalingServerConnection,
        roomData: RoomRecord,
        player: LocalPlayer,
        host: boolean,
    ) {
        this.ws = ws
        this.player = player
        this.id = roomData.id
        this.name = roomData.name
        this.state = roomData.state
        this.host = host
        this.players = [player]
        this.options = roomData.options

        if (!host) {
            roomData.players.forEach((player) => {
                const remotePlayer = new RemotePlayer(player.id, player.name)
                remotePlayer.ready = player.ready
                this.players.push(remotePlayer)
            })
        }

        this.ws.subscribe({
            "room-player-connected": this.handlePlayerConnected,
            "room-player-disconnected": this.handlePlayerDisconnected,
            "room-player-ready-change": this.handlePlayerReadyChange,
            "room-start-game": this.handleStartGame,
        } satisfies Pick<ServerMessageHandler, RoomMessageType>)
    }

    setReadyState(ready: boolean) {
        const self = this.players.find((player) => player.id === this.player.id)
        if (self) {
            self.ready = true
        }
        this.ws.send("player-change-ready-state", { id: this.player.id, ready })
    }

    startGame() {
        if (this.host) {
            this.ws.send("player-start-game", { id: this.id })
            this.state = RoomState.Complete
        }
    }

    private handlePlayerConnected: ServerMessageHandler["room-player-connected"] =
        ({ id, name, sessionDescription }) => {
            console.assert(
                this.players.length < this.options.maxPlayers,
                "Room has too many players",
            )

            this.players.push(new RemotePlayer(id, name))

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

    private handleStartGame: ServerMessageHandler["room-start-game"] = () => {
        this.state = RoomState.Complete
    }
}
