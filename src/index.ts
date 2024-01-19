import select, { Separator } from "@inquirer/select"
import input from "@inquirer/input"
import { WebSocket, createWebSocketStream } from "ws"
import { RTCSessionDescription } from "werift"
import { randomString } from "./utilities.js"
import { PeerConnection } from "./PeerConnection.js"

class Client {
    game?: string
    ws?: WebSocket
    pc?: PeerConnection

    constructor() {}

    async connectToSignalingServer(address: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`ws://${address}/`, {})

            const handleFailedToConnect = (err: string) => {
                console.log("WebSocket error", err)
                reject(err)
            }

            this.ws.once("open", () => {
                console.log("WebSocket opened")

                if (this.ws) {
                    // this.ws.off("error", handleFailedToConnect)
                }

                resolve(true)
            })

            this.ws.on("message", (data, isBinary) => {
                console.log(
                    "WebSocket message",
                    data.toString().length,
                    isBinary,
                )
            })

            this.ws.once("close", (code, reason) => {
                console.log("WebSocket closed", code, reason)
            })

            // this.ws.once("error", handleFailedToConnect)

            this.ws.on("error", (err) => {
                console.log("WebSocket error", err)
            })
        })
    }

    async createGame(): Promise<void> {
        this.game = randomString()

        this.pc = new PeerConnection()
        const sessionDescription = await this.pc.offer()

        console.debug(sessionDescription)

        if (this.ws) {
            const data = JSON.stringify({
                action: "host-game",
                id: this.game,
                sessionDescription: sessionDescription,
            })
            console.log("Sending local description", data.length)
            this.ws.send(data)
        }
    }

    async waitForOpponent(): Promise<void> {
        const opponent = await new Promise<{
            player: string
            sessionDescription: RTCSessionDescription
        }>((resolve, reject) => {
            const timeout = setTimeout(() => reject(false), 30000)

            this.ws?.once("message", (data, isBinary) => {
                clearTimeout(timeout)

                const json = JSON.parse(data.toString())
                if (json.action === "opponent-joined") {
                    console.log("Opponent joined successfully")
                    resolve({
                        player: json.player,
                        sessionDescription: json.sessionDescription,
                    })
                } else {
                    console.error("Received unexpected message", json.action)
                    reject(false)
                }
            })
        })

        // this.opponent = opponent.player
        await this.pc?.response(opponent.sessionDescription)
    }

    async findGame(): Promise<{} | undefined> {
        console.log("Loading games...")

        const games = await new Promise<{}[]>((resolve, reject) => {
            this.ws?.once("message", (data, isBinary) => {
                const json = JSON.parse(data.toString())

                if (json.action === "game-list") {
                    console.debug(
                        "Received expected game list",
                        json.games.length,
                    )
                    resolve(json.games)
                } else {
                    console.error("Received unexpected message", json.action)
                    reject(false)
                }
            })

            this.ws?.send(
                JSON.stringify({
                    action: "list-games",
                }),
                (err) => {
                    console.log("reply?", err)
                },
            )
        })

        let game

        const answer = await select({
            message: "Tic-tac-toe: Main Menu",
            choices: [
                ...games.map((game) => ({
                    name: `${game.name} by ${game.host}`,
                    value: game.name,
                    description: "Join game",
                })),
                new Separator(),
                {
                    name: "Back",
                    value: "back",
                    description: "Back",
                },
            ],
        })

        switch (answer) {
            case "back": {
                break
            }
            default: {
                game = games.find((game) => game.name === answer)
                break
            }
        }

        return game
    }

    async joinGame(game: {}) {
        console.debug(`Joining game... ${game.name}`)
        this.pc = new PeerConnection()
        const answer = await this.pc.answer(game.sessionDescription)

        this.ws?.send(
            JSON.stringify({
                action: "joined-game",
                id: game.name,
                sessionDescription: answer,
            }),
        )
    }

    async playGame(): Promise<boolean> {
        await this.pc?.send("START GAME!")

        setTimeout(() => {
            console.log("try to send some data...")
            this.pc?.send("message")
        }, 5000)

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                console.log("game over")
                this.pc?.close()
                resolve(true)
            }, 30000)
        })
    }
}

const startGame = async (): Promise<string | undefined> => {
    return undefined
}

const getSignalingServerAddress = async () =>
    await input({
        message: "Enter Server address",
        default: "127.0.0.1:9001",
    })

const hostGame = async (): Promise<Client | undefined> => {
    const address = await getSignalingServerAddress()
    const c = new Client()
    await c.connectToSignalingServer(address)
    await c.createGame()

    return c
}

const mainMenu = async () => {
    const answer = await select({
        message: "Tic-tac-toe: Main Menu",
        choices: [
            {
                name: "Single Player",
                value: "single-player",
                description: "Play a single player game",
            },
            {
                name: "Host Game",
                value: "host-game",
                description: "Host a multiplayer game",
            },
            {
                name: "Join Game",
                value: "join-game",
                description: "Join a multiplayer game",
            },
            new Separator(),
            {
                name: "Quit",
                value: "quit",
                description: "Quit",
            },
        ],
    })

    switch (answer) {
        case "single-player": {
            // const game = await startGame()
            // if (game) {
            //     await joinGame(game)
            //     await playGame(game)
            // }
            break
        }
        case "host-game": {
            const client = await hostGame()
            if (client) {
                await client.waitForOpponent()
                await client.playGame()
            }

            console.log("Game complete or didn't start...")
            break
        }
        case "join-game": {
            const client = new Client()
            const address = await getSignalingServerAddress()
            await client.connectToSignalingServer(address)
            const game = await client.findGame()

            if (game) {
                await client.joinGame(game)
                await client.playGame()
            }
            break
        }
        case "quit": {
            process.exit(0)
        }
    }
}

while (1) {
    await mainMenu()
}
