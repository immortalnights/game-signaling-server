import { TicTakToe } from "../src/tictactoe.js"

let t = new TicTakToe()

t.playerMove(0, 0)
t.playerMove(1, 4)
t.playerMove(0, 1)
t.playerMove(1, 2)
t.playerMove(0, 6)
t.playerMove(1, 3)
t.playerMove(0, 5)
t.playerMove(1, 8)
t.playerMove(0, 7)
t.render()
console.log("Winner?", t.calculateWinner())

t = new TicTakToe()

t.playerMove(0, 0)
t.playerMove(1, 4)
t.playerMove(0, 1)
t.playerMove(1, 5)
t.playerMove(0, 2)
t.render()
console.log("Winner?", t.calculateWinner())
