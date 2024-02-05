import { setTimeout } from "node:timers/promises"
import {
    Game,
    Player,
    GamePlayer,
    GameState,
    waitFor,
} from "../client/index.js"
import type { GameOptions } from "../signalingserver/index.js"
import { takeTurn } from "./cli.js"

type Tokens = "O" | "X"

export class TicTakToe extends Game {
    token: Tokens
    turn: Tokens
    spaces: (Tokens | undefined)[]
    winner: Tokens | undefined
    lastPlayer: string | undefined

    constructor(players: Player[], name: string, options: GameOptions) {
        super(players, name, options)
        this.token = this.localPlayer.host ? "O" : "X"
        this.turn = "O"
        this.spaces = new Array(9).fill(undefined)
    }

    render() {
        const s = this.spaces

        const v = (index: number) => {
            return s[index] || " "
        }

        console.clear()
        console.log(` ${v(0)} | ${v(1)} | ${v(2)} `)
        console.log(`---+---+---`)
        console.log(` ${v(3)} | ${v(4)} | ${v(5)} `)
        console.log(`---+---+---`)
        console.log(` ${v(6)} | ${v(7)} | ${v(8)} `)
    }

    get availableMoves(): number[] {
        return this.spaces
            .map((value, index) => (!value ? index : undefined))
            .filter((value) => value !== undefined) as number[]
    }

    async play() {
        while (!this.finished() && this.state === GameState.Playing) {
            if (this.token === this.turn) {
                this.render()
                const move = await takeTurn(this.availableMoves)
                this.handlePlayerInput({ token: this.token, move })
                await setTimeout(250)
            } else {
                this.render()
                console.log("Waiting for opponent...")
                // Wait for own turn, timeout two minutes
                await waitFor(() => this.turn === this.token, 2 * 60 * 1000)
                await setTimeout(250)
            }
        }
    }

    finished() {
        return !!this.calculateWinner() || this.availableMoves.length === 0
    }

    protected serialize() {
        return {
            state: this.state,
            spaces: this.spaces,
            turn: this.turn,
            winner: this.winner,
            currentPlayer: undefined,
        }
    }

    protected actionPlayerInput(player: GamePlayer, input: object): void {
        if (this.host) {
            console.log(`Apply turn for ${player.id}`)
            // Apply the turn
            const token = this.turn

            // TODO validate the player turn, token, etc
            // TODO use player ID as turn, not the token...

            // player.id === this.host.id ? "O" : "X"
            this.takePlayerTurn(token, input.move)

            // Flip the turn
            this.turn = token === "O" ? "X" : "O"

            this.winner = this.calculateWinner()
            if (this.winner) {
                this.state = GameState.Finished
            } else {
            }

            // Send the update
            this.sendGameUpdate()
        } else {
            console.error("None host attempted to action player input")
        }
    }

    protected handleInitialGameDate(data: object) {
        if (!this.host) {
            // Set the local state
        } else {
            console.error("Host received initial game update")
        }
    }

    protected handleGameUpdate(update: object): void {
        if (!this.host) {
            this.state = update.state
            this.spaces = update.spaces
            this.turn = update.turn
            this.winner = update.winner
        } else {
            console.error("Host received game update")
        }
    }

    async takeTurn(player: Player, position: number) {
        this.handlePlayerInput(player, {
            move: position,
        })
    }

    takePlayerTurn(token: Tokens, position: number) {
        if (token !== "O" && token !== "X") {
            throw Error("Invalid player")
        }

        if (token === this.lastPlayer) {
            throw Error("Incorrect player turn")
        }

        if (position < 0 || position > 8) {
            throw Error("Invalid position, out of range")
        }

        if (this.spaces[position]) {
            throw Error("Invalid position, space take")
        }

        console.debug(`Placing token ${token} at position ${position}`)
        this.spaces[position] = token
        this.lastPlayer = token
    }

    calculateWinner() {
        const lines = [
            [0, 1, 2],
            [3, 4, 5],
            [6, 7, 8],
            [0, 3, 6],
            [1, 4, 7],
            [2, 5, 8],
            [0, 4, 8],
            [2, 4, 6],
        ]

        let winner

        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i]
            if (
                this.spaces[a] &&
                this.spaces[a] === this.spaces[b] &&
                this.spaces[a] === this.spaces[c]
            ) {
                winner = this.spaces[a]
            }
        }

        return winner
    }
}
