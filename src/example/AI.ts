import { Player } from "../node/Player.js"
import { TicTakToe } from "./TicTacToe.js"

export class AI extends Player {
    constructor() {
        super(undefined, `AI ${Math.floor(Math.random() * 10)}`)
    }

    randomNextMove(game: TicTakToe): number {
        return game.availableMoves[
            Math.floor(Math.random() * game.availableMoves.length)
        ]
    }
}
