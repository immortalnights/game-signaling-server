import { Game, GameState } from "./Game.js"
import { LocalPlayer } from "./LocalPlayer.js"
import { PeerConnection } from "./PeerConnection.js"
import { Player } from "./Player.js"
import { GameOptions } from "./signalingserver/types.js"

export class TicTakToe extends Game {
    token: "O" | "X"
    spaces: (string | undefined)[]
    lastPlayer: string | undefined

    constructor(players: Player[], name: string, options: GameOptions) {
        super(players, name, options)
        this.token = true ? "O" : "X"
        this.spaces = new Array(9).fill(undefined)
    }

    render() {
        const s = this.spaces

        const v = (index: number) => {
            return s[index] || " "
        }

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

    get getState() {
        return {
            state: this.state,
            spaces: this.spaces,
            turn: 0, // TODO turn counter
            currentPlayer: undefined,
        }
    }

    async play() {}

    finished() {
        return !!this.calculateWinner() || this.availableMoves.length === 0
    }

    protected actionPlayerInput(player: Player, input: object): void {
        if (this.host) {
            // Apply the turn

            // player.id === this.host.id ? "O" : "X"
            this.takePlayerTurn(this.token, input.position)

            const winner = this.calculateWinner()
            if (winner) {
                this.state = GameState.Finished
            }

            // Send the update
            this.sendGameUpdate({ ...this.getState, winner })
        } else {
            console.error("None host attempted to action player input")
        }
    }

    protected handleGameUpdate(update: object): void {
        if (!this.host) {
        } else {
            console.error("Host received game update")
        }
    }

    async takeTurn(player: Player, position: number) {
        this.handlePlayerInput(player, {
            move: position,
        })
    }

    takePlayerTurn(token: string, position: number) {
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

        this.spaces[position] = token
        this.lastPlayer = token

        this.sendGameUpdate()
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
