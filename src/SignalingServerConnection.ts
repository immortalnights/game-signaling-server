import { WebSocket, RawData } from "ws"
import { GameOptions, GameRecord } from "./signalingserver/types.js"

export class SignalingServerConnection {
    private ws?: WebSocket
    address: string

    constructor(address: string) {
        this.address = address
    }

    async waitForMessage() {}

    /**
     *
     */
    async host(
        name: string,
        options?: Omit<GameOptions, "name">,
    ): Promise<GameRecord> {
        // send "host-game", {name ,...options}
        return Promise.reject()
    }

    /**
     *
     */
    async list(): Promise<GameRecord[]> {
        return Promise.reject()
    }

    async join(game: GameRecord): Promise<GameRecord> {
        return Promise.reject()
    }

    async connect(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`ws://${this.address}/`, {})

            const handleFailedToConnect = (err: string) => {
                console.log("WebSocket error", err)
                reject(err)
            }

            this.ws.once("open", () => {
                console.log("WebSocket opened")

                if (this.ws) {
                    this.ws.off("error", handleFailedToConnect)

                    this.ws.on("error", (err) => {
                        console.log("WebSocket error", err)
                    })
                }

                resolve(true)
            })

            this.ws.on("message", this.handleMessage.bind(this))

            this.ws.once("close", (code, reason) => {
                console.log("WebSocket closed", code, reason)
            })

            this.ws.once("error", handleFailedToConnect)
        })
    }

    disconnect() {
        if (this.ws) {
            this.ws?.close()
        }
    }

    private send(data: {}) {}

    private handleMessage(data: RawData, isBinary: boolean) {
        console.log("WebSocket message", data.toString().length, isBinary)
    }
}

// test
const ss = new SignalingServerConnection("127.0.0.1:9001")
await ss.connect()
await ss.list()
await ss.host("MyGame", { maxPlayers: 2 })
await ss.list()
ss.disconnect()
