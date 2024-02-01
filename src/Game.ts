import { setTimeout } from "node:timers/promises"
import { randomUUID } from "node:crypto"
import { PeerMessage } from "./PeerConnection.js"
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

export abstract class Game {
    id: string
    state: GameState
    name: string
    options: GameOptions
    // Game host
    host: Player
    // Local player
    localPlayer: LocalPlayer
    // All players, including the local player and host
    players: Player[]

    constructor(
        host: string,
        players: Player[],
        name: string,
        options: GameOptions,
    ) {
        this.id = randomUUID()
        this.state = GameState.Setup
        this.name = name
        this.options = options
        this.host =
            players.find((player) => player.id === host) ??
            throwError("Failed to find host for game")

        this.localPlayer = (players.find(
            (player) => player instanceof LocalPlayer,
        ) ?? throwError("Failed to find local player")) as LocalPlayer

        // this.localPlayer.peerConnection.subscribe((data) =>
        //     this.handlePeerMessage(player, data),
        // )

        this.players = [...players]
    }

    async waitForReady(timeout = 30000) {
        let duration = 0
        while (duration < timeout || this.state !== GameState.Ready) {
            await setTimeout(500)
        }

        return this.state === GameState.Ready
    }

    /**
     * Handle the input of any player, updating the game state accordingly
     *
     * @param player
     * @param input
     */
    protected abstract actionPlayerInput(player: Player, input: object): void

    protected abstract handleGameUpdate(update: object): void

    private handlePeerMessage(player: Player, message: PeerMessage) {
        if ("name" in message) {
            const name = message.name as string // FIXME
            if (name === "player-ready") {
                // TODO
            } else if (name === "player-input") {
                console.assert(
                    player.id === message.player,
                    "Missing or invalid player ID in message",
                )

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
            this.localPlayer.peerConnection.send(
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
                    player.peerConnection.send(
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
