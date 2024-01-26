import { setTimeout } from "node:timers/promises"
import { TicTakToe } from "./TicTacToe.js"
import {
    joinGameMenu,
    mainMenu,
    multiplayerMenu,
    multiplayerServerAddress,
    takeTurn,
} from "./cli.js"
import { SignalingServerConnection } from "./SignalingServerConnection.js"
import { PeerConnection } from "./PeerConnection.js"
import { GameRecord } from "./signalingserver/types.js"

class Game {
    // TODO
}

class RemotePlayer {
    async wait() {
        return Promise.reject()
    }
}

class AI {
    randomNextMove(game: TicTakToe): number {
        return game.availableMoves[
            Math.floor(Math.random() * game.availableMoves.length)
        ]
    }
}

enum State {
    MainMenu,
    ServerConnectionMenu,
    ConnectingToServer,
    MultiplayerMenu,
    // HostMultiplayerGame,
    JoinGameMenu,
    WaitingForOpponent,
    WaitingForTurn,
    GameOver,
}

class Player {
    state: State
    private host?: boolean
    private ws?: SignalingServerConnection
    private peerConnection?: PeerConnection
    private multiplayerGame?: GameRecord

    constructor() {
        this.state = State.MainMenu
    }

    get token() {
        return this.host ? "O" : "X"
    }

    get connected() {
        return this.ws?.connected
    }

    close() {
        if (this.ws) {
            this.ws.disconnect()
        }

        if (this.peerConnection) {
            this.peerConnection.close()
        }
    }

    hostLocalGame() {
        this.host = true
    }

    async connectToMultiplayerServer(address: string) {
        this.ws = new SignalingServerConnection(address)
        return this.ws.connect()
    }

    async hostMultiplayerGame(name: string) {
        let res = false
        this.host = true
        if (this.ws) {
            this.peerConnection = new PeerConnection()
            this.multiplayerGame = await this.ws.host(
                name,
                this.peerConnection,
                {
                    maxPlayers: 2,
                },
            )

            res = true
        }

        return res ? Promise.resolve() : Promise.reject()
    }

    async waitForOpponent() {
        return this.ws
            ? this.ws.waitForMessage("player-joined")
            : Promise.reject()
    }

    async findMultiplayerGame() {
        return this.ws ? this.ws.list() : Promise.reject()
    }

    async joinMultiplayerGame(game: GameRecord) {
        const host = game.players.find((player) => player.host)

        if (!host || !host.sessionDescription) {
            throw Error("Failed to find host connection information in game")
        }

        this.peerConnection = new PeerConnection()
        await this.peerConnection.answer(host?.sessionDescription)
        await this.peerConnection.
    }
}

let player = new Player()
let game: undefined | TicTakToe
let opponent: RemotePlayer | AI | undefined

const reset = async () => {
    game = undefined
    opponent = undefined

    // reset player
    if (player) {
        player.close()
        player = new Player()
    }
    await setTimeout(2000)
}

let play = true
while (play) {
    switch (player.state) {
        case State.MainMenu: {
            console.clear()
            try {
                const choice = await mainMenu()

                switch (choice) {
                    case "single-player": {
                        console.log("Start a single player game")
                        player.hostLocalGame()
                        game = new TicTakToe()
                        opponent = new AI()
                        player.state = State.WaitingForTurn
                        break
                    }
                    case "multiplayer": {
                        const serverAddress = await multiplayerServerAddress()
                        console.log(`Connection to ${serverAddress}...`)
                        player.connectToMultiplayerServer(serverAddress)
                        player.state = State.ConnectingToServer
                        break
                    }
                }
            } catch (error) {
                play = false
            }
            break
        }
        case State.ConnectingToServer: {
            console.log("Connecting to server...")

            let timeout = 5000
            while (!player.connected && timeout > 0) {
                await setTimeout(500)
                timeout -= 500
            }

            if (player.connected) {
                console.log("Connected")
                player.state = State.MultiplayerMenu
            } else {
                console.log("Failed to connect")
                await reset()
            }
            break
        }
        case State.MultiplayerMenu: {
            try {
                const choice = await multiplayerMenu()
                switch (choice) {
                    case "host-game": {
                        try {
                            await player.hostMultiplayerGame("MyGame")
                            player.state = State.WaitingForOpponent
                        } catch (error) {
                            console.error("Failed to host multiplayer game")
                        }
                        break
                    }
                    case "join-game": {
                        try {
                            const games = await player.findMultiplayerGame()
                            const choice = await joinGameMenu(games)
                            if (choice) {
                                await player.joinMultiplayerGame(
                                    games.find((game) => game.id === choice),
                                )
                            } else {
                                player.close()
                                player.state = State.MainMenu
                            }
                        } catch (error) {
                            console.error(
                                `Failed to join multiplayer game ${error}`,
                            )
                            player.close()
                            player.state = State.MainMenu
                        }
                        break
                    }
                }
            } catch (error) {
                player.close()
                player.state = State.MainMenu
            }
            break
        }
        case State.WaitingForOpponent: {
            console.log("Waiting for opponent")
            try {
                await player.waitForOpponent()
            } catch (error) {
                console.error("Failed to find an opponent")
            }
            // if (!game) {
            //     throw new Error("Invalid game for state")
            // }

            // if (!opponent) {
            //     throw new Error("Invalid opponent for game")
            // }

            // let move
            // let token
            // if (opponent instanceof RemotePlayer) {
            //     token = player.host ? "O" : "X"
            //     move = await opponent.wait()
            // } else {
            //     token = "X"
            //     move = opponent.randomNextMove(game)
            //     console.log(`AI move ${move}`)
            // }

            // game.playerMove(token, move)

            // if (game.finished()) {
            //     player.state = State.GameOver
            // } else {
            //     player.state = State.WaitingForTurn
            // }
            break
        }
        case State.WaitingForTurn: {
            if (!game) {
                throw new Error("Invalid game for state")
            }

            try {
                game.render()
                const move = await takeTurn(game.availableMoves)
                game.playerMove(player.token, move)

                if (game.finished()) {
                    player.state = State.GameOver
                } else {
                    player.state = State.WaitingForOpponent
                }
            } catch (error) {
                console.log("Player has quit game", error)
                reset()
            }
            break
        }
        case State.GameOver: {
            console.clear()
            game?.render()
            const winner = game?.calculateWinner()
            console.log(`${winner} Wins!`)
            await reset()
            break
        }
    }
}
