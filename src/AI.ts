import { Opponent } from "./Opponent.js"
import { TicTakToe } from "./TicTacToe.js"

export class AI extends Opponent {
    randomNextMove(game: TicTakToe): number {
        return game.availableMoves[
            Math.floor(Math.random() * game.availableMoves.length)
        ]
    }
}
