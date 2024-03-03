import { ServerMessageHandler } from "../signalingserver/message.js"
import { GameOptions, RoomRecord } from "../signalingserver/types.js"
import { SignalingServerConnection } from "./SignalingServerConnection.js"
import { LocalPlayer } from "./LocalPlayer.js"
import { Player } from "./Player.js"
import { RemotePlayer } from "./RemotePlayer.js"
import { RTCSessionDescription } from "werift"
import { RoomState } from "../signalingserver/states.js"

type RoomMessageType =
    | "room-player-connected"
    | "room-player-disconnected"
    | "room-player-ready-change"
    | "room-start-game"
    | "room-closed"

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
    ) {
        this.ws = ws
        this.player = player
        this.id = roomData.id
        this.name = roomData.name
        this.state = roomData.state
        this.host = player.host
        this.players = [player]
        this.options = roomData.options

        if (!player.host) {
            roomData.players.forEach((roomPlayer) => {
                if (roomPlayer.id !== player.id) {
                    const remotePlayer = new RemotePlayer(
                        roomPlayer.id,
                        roomPlayer.name,
                    )
                    remotePlayer.ready = roomPlayer.ready
                    this.players.push(remotePlayer)
                }
            })
        }

        this.ws.subscribe({
            "room-player-connected": this.handlePlayerConnected,
            "room-player-disconnected": this.handlePlayerDisconnected,
            "room-player-ready-change": this.handlePlayerReadyChange,
            "room-start-game": this.handleStartGame,
            "room-closed": this.handlerRoomClosed,
        } satisfies Pick<ServerMessageHandler, RoomMessageType>)
    }

    setReadyState(ready: boolean) {
        this.ws.send("player-change-ready-state", {
            id: this.player.id!,
            ready,
        })
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

            console.debug(`Player '${name}' (${id}) has joined room`)
            this.players.push(new RemotePlayer(id, name))

            if (this.host) {
                if (sessionDescription) {
                    this.player.peerConnection.response(
                        new RTCSessionDescription(
                            sessionDescription.sdp,
                            sessionDescription.type,
                        ),
                    )
                } else {
                    console.error(
                        "Player connected without RTC answer, expected by host",
                    )
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
                console.log(
                    `Player '${player.name}' (${player.id}) is now ready`,
                )
                player.ready = ready
            } else {
                console.error(
                    `Failed to find expected player '${id}' in room )`,
                )
            }
        }

    private handleStartGame: ServerMessageHandler["room-start-game"] = () => {
        this.state = RoomState.Complete
        console.log("Room state changed to Complete")
    }

    private handlerRoomClosed: ServerMessageHandler["room-closed"] = () => {
        this.state = RoomState.Closed
        console.log("Room state changed to Closed")
    }
}
