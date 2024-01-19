export class TicTakToe {
    spaces: (string | undefined)[]
    lastPlayer: number | undefined

    constructor() {
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

    playerMove(player: number, position: number) {
        if (player < 0 || player > 1) {
            throw Error("Invalid player")
        }

        if (player === this.lastPlayer) {
            throw Error("Incorrect player turn")
        }

        if (position < 0 || position > 8) {
            throw Error("Invalid position, out of range")
        }

        if (this.spaces[position]) {
            throw Error("Invalid position, space take")
        }

        this.spaces[position] = player === 0 ? "O" : "X"
        this.lastPlayer = player
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
