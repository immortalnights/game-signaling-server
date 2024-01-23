import { setTimeout } from "node:timers/promises"
import { TicTakToe } from "./TicTacToe.js"
import { mainMenu, multiplayerMenu, takeTurn } from "./cli.js"

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
    ConnectingToServer,
    MultiplayerMenu,
    JoinGameMenu,
    WaitingForOpponent,
    WaitingForTurn,
    GameOver,
}

interface Player {
    state: State
    host?: boolean
}

let player: Player = { state: State.MainMenu, host: undefined }
let game: undefined | TicTakToe
let opponent: RemotePlayer | AI | undefined

const reset = () => {
    game = undefined
    opponent = undefined
    player.host = undefined
    player.state = State.MainMenu
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
                        player.host = true
                        game = new TicTakToe()
                        opponent = new AI()
                        player.state = State.WaitingForTurn
                        break
                    }
                    case "multiplayer": {
                        console.log("Start a multiplayer game")
                        break
                    }
                }
            } catch (error) {
                play = false
            }
            break
        }
        case State.ConnectingToServer: {
            break
        }
        case State.WaitingForOpponent: {
            if (!game) {
                throw new Error("Invalid game for state")
            }

            if (!opponent) {
                throw new Error("Invalid opponent for game")
            }

            let move
            let token
            if (opponent instanceof RemotePlayer) {
                token = player.host ? "O" : "X"
                move = await opponent.wait()
            } else {
                token = "X"
                move = opponent.randomNextMove(game)
                console.log(`AI move ${move}`)
            }

            game.playerMove(token, move)

            if (game.finished()) {
                player.state = State.GameOver
            } else {
                player.state = State.WaitingForTurn
            }
            break
        }
        case State.WaitingForTurn: {
            if (!game) {
                throw new Error("Invalid game for state")
            }

            try {
                game.render()
                const move = await takeTurn(game.availableMoves)
                game.playerMove(player.host ? "O" : "X", move)

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
            await setTimeout(2000)
            reset()
            break
        }
    }
}
