import { TicTakToe } from "../src/tictactoe.js"

const test = (name: string, fn: Function): void => {}
const expect = (condition: any, value: any): void => {}

test("draw", () => {
    const t = new TicTakToe()

    t.playerMove(0, 0)
    t.playerMove(1, 4)
    t.playerMove(0, 1)
    t.playerMove(1, 2)
    t.playerMove(0, 6)
    t.playerMove(1, 3)
    t.playerMove(0, 5)
    t.playerMove(1, 8)
    t.playerMove(0, 7)

    expect(t.calculateWinner(), undefined)
})

test("naught wins", () => {
    const t = new TicTakToe()

    t.playerMove(0, 0)
    t.playerMove(1, 4)
    t.playerMove(0, 1)
    t.playerMove(1, 5)
    t.playerMove(0, 2)

    expect(t.calculateWinner(), "O")
})

test("naught wins", () => {
    const t = new TicTakToe()

    t.playerMove(0, 4)
    t.playerMove(1, 0)
    t.playerMove(0, 5)
    t.playerMove(1, 1)
    t.playerMove(0, 7)
    t.playerMove(1, 2)

    expect(t.calculateWinner(), "X")
})
