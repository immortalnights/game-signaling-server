import select, { Separator } from "@inquirer/select"
import input from "@inquirer/input"
import { WebSocket, createWebSocketStream } from "ws"
import { RTCPeerConnection } from "werift"

class Client {
    game?: string
    ws?: WebSocket
    rtc?: RTCPeerConnection
    dc?: RTCDataChannel

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

                this.ws?.send("ping", () => {})

                setTimeout(() => {
                    resolve(true)
                }, 1000)
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

    async createGame(): Promise<boolean> {
        this.game = randomString()

        const pc = new RTCPeerConnection({})
        pc.iceConnectionStateChange.subscribe((v) =>
            console.log("pc.iceConnectionStateChange", v),
        )

        const dc = pc.createDataChannel("game", {
            protocol: "ttt",
        })

        dc.stateChanged.subscribe((v) => {
            console.log("dc.stateChanged", v)
            if (v === "open") {
                console.log("open")
            }
        })

        let index = 0
        dc.message.subscribe((data) => {
            console.log("message", data.toString())
            dc.send("pong" + index++)
        })

        const offer = await pc.createOffer()!
        await pc.setLocalDescription(offer)

        return new Promise((resolve, reject) => {
            if (this.ws) {
                const data = JSON.stringify(pc.localDescription)
                console.log("Sending local description", data.length)
                this.ws.send(data)
            } else {
                console.log("Invalid WebSocket")
                reject(false)
            }
        })

        // const answer = JSON.parse(
        //     await new Promise((r) =>
        //         socket.on("message", (data) => r(data as string)),
        //     ),
        // )
        // console.log(answer)

        // await pc.setRemoteDescription(answer)
    }

    async waitForOpponent(): Promise<boolean> {
        const check = (timeout: number = 0) => {
            return false
        }

        return new Promise((resolve, reject) => {
            let ok = false
            let timeout = false
            const wait = () =>
                setTimeout(() => {
                    console.log("Checking...")
                    if (ok) {
                        resolve(true)
                    } else if (timeout) {
                        reject(false)
                    } else {
                        wait()
                    }
                }, 1000)

            wait()
        })
    }

    async playGame(): Promise<boolean> {
        return false
    }
}

const randomString = (len: number = 6) =>
    (Math.random() + 1).toString(36).substring(len)

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

// const findGame = async (): Promise<string | undefined> => {
//     const address = getSignalingServerAddress()

//     await connectToSig(address)

//     // fetch games
//     console.log("Loading games...")

//     let game

//     const answer = await select({
//         message: "Tic-tac-toe: Main Menu",
//         choices: [
//             // TODO list games
//             new Separator(),
//             {
//                 name: "Back",
//                 value: "back",
//                 description: "Back",
//             },
//         ],
//     })

//     switch (answer) {
//         case "back": {
//             break
//         }
//     }

//     return game
// }

const joinGame = async (game: string) => {}
const playGame = async (game: string) => {}

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
            const game = await startGame()
            if (game) {
                await joinGame(game)
                await playGame(game)
            }
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
            client.connectToSignalingServer(address)
            // const games = await client.findGames()

            // if (game) {
            //     await joinGame(game)
            //     await playGame(game)
            // }
            break
        }
        case "quit": {
            process.exit(0)
        }
    }
}

const main = async () => {
    while (1) {
        await mainMenu()
    }
}

main()
