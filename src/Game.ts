import { setTimeout } from "node:timers/promises"
import { randomUUID } from "node:crypto"
import { PeerConnection, PeerMessage } from "./PeerConnection.js"
import { Player } from "./Player.js"
import { throwError } from "./signalingserver/utils.js"
import { GameOptions } from "./signalingserver/types.js"
import { LocalPlayer } from "./LocalPlayer.js"
import { RemotePlayer } from "./RemotePlayer.js"
import { AI } from "./AI.js"

export enum GameState {
    Setup,
    Ready,
    Paused,
    Playing,
    Finished,
}

enum GamePlayerState {
    Initializing,
    WorldBuilding,
    Ready,
}

class GamePlayer {
    id: string
    name: string
    state: GamePlayerState
    local: boolean
    host: boolean
    peerConnection?: PeerConnection

    constructor(
        id: string,
        name: string,
        host: boolean,
        local: boolean,
        peerConnection?: PeerConnection,
    ) {
        this.id = id
        this.name = name
        this.state = GamePlayerState.Initializing
        this.local = local
        this.host = host
        this.peerConnection = peerConnection
    }
}

export abstract class Game {
    id: string
    state: GameState
    name: string
    options: GameOptions
    host: boolean
    players: GamePlayer[]

    peerConnection: PeerConnection

    constructor(players: Player[], name: string, options: GameOptions) {
        this.id = randomUUID()
        this.state = GameState.Setup
        this.name = name
        this.options = options

        // Take the peer connection from the LocalPlayer
        this.peerConnection = (
            (players.find((player) => player instanceof LocalPlayer) ??
                throwError("Failed to find local player")) as LocalPlayer
        ).peerConnection

        // Convert Lobby Players to Game Players
        this.players = players.map((player) => {
            const isLocal = player instanceof LocalPlayer
            return new GamePlayer(player.id, player.name, player.host, isLocal)
        })

        // Identify if _this_ is the host player
        this.host = !!this.players.find((player) => player.host && player.local)

        // Subscript to the data channel
        this.peerConnection.subscribe((data) => this.handlePeerMessage(data))
    }

    setup() {
        if (this.state === GameState.Setup) {
            if (this.host) {
                // Host
                console.log("Host is setting up the game...")
            } else {
                // Local player
                console.log("Client is waiting for game data...")
            }
        }
    }

    abstract play(): void

    /**
     * Handle the input of any player, updating the game state accordingly
     *
     * @param player
     * @param input
     */
    protected abstract actionPlayerInput(player: Player, input: object): void

    protected abstract handleGameUpdate(update: object): void

    private handlePeerMessage(message: PeerMessage) {
        if ("name" in message) {
            const name = message.name as string // FIXME
            if (name === "player-ready") {
                // TODO
            } else if (name === "player-input") {
                console.assert(
                    this.host === this.localPlayer,
                    "Handling player input in the wrong place",
                )

                this.actionPlayerInput(player, message.data ?? {})
            } else if (name === "player-chat") {
                this.handlePlayerChat(player, message.data ?? {})
            } else if (name === "game-update") {
                this.handleGameUpdate(message.data ?? {})
            }
        }
    }

    handlePlayerChat(player: Player, data: object) {
        // TODO
    }

    /**
     * Route the input of any player. Remote players will call this when a
     *  player action is received, local player will call this directly
     *
     * @param input
     */
    handlePlayerInput(player: Player, input: object) {
        if (player.id === this.host.id) {
            this.actionPlayerInput(player, input)
        } else {
            this.peerConnection.send(
                JSON.stringify({
                    name: "player-input",
                    player: player.id,
                    data: input,
                }),
            )
        }
    }

    sendGameUpdate(update: object) {
        if (this.host) {
            this.players.forEach((player) => {
                // Don't send the update to the host
                if (player.id !== this.host.id) {
                    this.peerConnection.send(
                        JSON.stringify({
                            name: "game-update",
                            data: update,
                        }),
                    )
                }
            })
        }
    }
}
