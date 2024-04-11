import { randomUUID } from "node:crypto"
import { PeerConnection, PeerMessage } from "./PeerConnection.js"
import { Player } from "./Player.js"
import { GameOptions, throwError } from "../signalingserver/index.js"
import { LocalPlayer } from "./LocalPlayer.js"
import { waitFor } from "./utilities.js"

export enum GameState {
    Setup,
    Ready,
    Paused,
    Playing,
    Finished,
}

export enum GamePlayerState {
    Joining,
    Initializing,
    WorldBuilding,
    Ready,
    Paused,
}

export class GamePlayer {
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
        this.state = GamePlayerState.Joining
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
    localPlayer: GamePlayer
    host: boolean
    players: GamePlayer[]

    peerConnection: PeerConnection

    constructor(players: Player[], name: string, options: GameOptions) {
        this.id = randomUUID()
        this.state = GameState.Setup
        this.name = name
        this.options = options

        console.debug(players)

        // Take the peer connection from the LocalPlayer
        this.peerConnection = (
            (players.find((player) => player instanceof LocalPlayer) ??
                throwError("Failed to find local player")) as LocalPlayer
        ).peerConnection

        // Convert Lobby Players to Game Players
        this.players = players.map((player) => {
            const isLocal = player instanceof LocalPlayer
            return new GamePlayer(player.id!, player.name, player.host, isLocal)
        })

        this.localPlayer =
            this.players.find((player) => player.local) ??
            throwError("Failed to find local player")

        // Identify if _this_ is the host player
        this.host = !!this.players.find((player) => player.host && player.local)

        // Subscript to the data channel
        this.peerConnection.subscribe((data) => this.handlePeerMessage(data))
    }

    async setup() {
        if (this.state === GameState.Setup) {
            if (this.host) {
                // Host
                this.setPlayerState(
                    this.localPlayer,
                    GamePlayerState.Initializing,
                )

                console.log("Waiting for players to join...")
                await waitFor(() =>
                    this.players.every(
                        (player) =>
                            player.state === GamePlayerState.Initializing,
                    ),
                )

                console.log("Host is setting up the game...")
                const data = this.serialize()
                this.peerConnection.send({
                    name: "game-update",
                    data,
                })

                this.setPlayerState(this.localPlayer, GamePlayerState.Ready)

                console.log("Waiting for players to become ready...")
                await waitFor(() =>
                    this.players.every(
                        (player) => player.state === GamePlayerState.Ready,
                    ),
                )

                console.log("Game is now playing...")
                this.setGameState(GameState.Playing)

                console.log("Host setup is complete")
            } else {
                // Local player
                console.log("Client is waiting for game data...")
                this.setPlayerState(
                    this.localPlayer,
                    GamePlayerState.Initializing,
                )

                console.log("Client is waiting for game play state...")
                await waitFor(() => this.state === GameState.Playing)

                console.log("Client setup is complete")
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
    protected abstract actionPlayerInput(
        player: GamePlayer,
        input: object,
    ): void

    protected abstract handleInitialGameDate(data: object): void

    protected abstract handleGameUpdate(update: object): void

    protected abstract serialize(): object

    private handlePeerMessage(message: PeerMessage) {
        console.log("Received peer message", message)
        if ("name" in message) {
            const name = message.name as string // FIXME
            if (this.host) {
                const player = this.players.find(
                    (player) => player.id === message.body.player,
                )

                if (player) {
                    if (name === "player-state-update") {
                        this.setPlayerState(player, message.body.state)
                    } else if (name === "player-chat") {
                        this.handlePlayerChat(player, message.body ?? {})
                    } else if (name === "player-input") {
                        this.actionPlayerInput(player, message.body ?? {})
                    }
                } else {
                    console.error(
                        `Failed to find player ${message.body.player}`,
                    )
                }
            } else {
                if (name === "game-state-update") {
                    this.state = message.body.state
                } else if (name === "game-update") {
                    if (this.state === GameState.Setup) {
                        this.handleInitialGameDate(message.body ?? {})
                        this.setPlayerState(
                            this.localPlayer,
                            GamePlayerState.Ready,
                        )
                    } else {
                        this.handleGameUpdate(message.body ?? {})
                    }
                }
            }
        } else {
            console.error(`Message is missing message 'name'`)
        }
    }

    handlePlayerChat(player: GamePlayer, data: object) {
        // TODO
    }

    /**
     * Route the input of any player. Remote players will call this when a
     *  player action is received, local player will call this directly
     *
     * @param input
     */
    handlePlayerInput(input: object) {
        if (this.host) {
            this.actionPlayerInput(this.localPlayer, input)
        } else {
            console.debug("Sending player input")
            this.peerConnection.send({
                name: "player-input",
                body: { player: this.localPlayer.id, ...input },
            })
        }
    }

    setGameState(state: GameState) {
        if (this.host) {
            this.state = state
            this.peerConnection.send({
                name: "game-state-update",
                body: { state: this.state },
            })
        } else {
            this.state = GameState.Playing
        }
        console.debug(`Game is now ${this.state}`)
    }

    setPlayerState(player: GamePlayer, state: GamePlayerState) {
        if (this.host) {
            player.state = state
            console.debug(`Player ${player.name} is now ${player.state}`)
        } else {
            this.peerConnection.send({
                name: "player-state-update",
                body: {
                    player: player.id,
                    state,
                },
            })
        }
    }

    sendGameUpdate() {
        if (this.host) {
            const data = this.serialize()
            // Don't send the update to the host
            console.debug("Sending game update...")
            this.peerConnection.send({
                name: "game-update",
                body: data,
            })
        }
    }
}
