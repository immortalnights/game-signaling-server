import { joinGameMenu, mainMenu, multiplayerMenu, takeTurn } from "./cli.js"
import { GameRecord } from "./signalingserver/types.js"

let resp

resp = await mainMenu()
console.log("resp", resp)
resp = await takeTurn([1, 3, 5, 7, 9])
console.log("resp", resp)
resp = await multiplayerMenu()
console.log("resp", resp)

const games = [
    {
        id: "A",
        name: "A Game",
        players: [
            {
                id: "A",
                name: "The host",
                ready: false,
                sessionDescription: undefined,
                host: true,
            },
        ],
        options: { maxPlayers: 2 },
    },
    {
        id: "B",
        name: "B Game",
        players: [
            {
                id: "A",
                name: "The host",
                ready: false,
                sessionDescription: undefined,
                host: true,
            },
        ],
        options: { maxPlayers: 2 },
    },
] satisfies GameRecord[]
resp = await joinGameMenu(games)
console.log("resp", resp)
