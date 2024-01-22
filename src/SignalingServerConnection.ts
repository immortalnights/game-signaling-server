import { WebSocket, RawData } from "ws"
import { GameOptions, GameRecord, Message } from "./signalingserver/types.js"
import { RTCSessionDescription } from "werift"

export class SignalingServerConnection {
    private ws?: WebSocket
    address: string
    private handleErrorBind: (error: string) => void

    constructor(address: string) {
        this.address = address
        this.handleErrorBind = this.handleError.bind(this)
    }

    /**
     *
     * @param name
     * @returns
     */
    async waitForMessage<T>(name: string): Promise<T> {
        return new Promise((resolve, reject) => {
            const handleMessage = (data: RawData, isBinary: boolean) => {
                this.ws?.off("error", this.handleError)

                const message = this.handleMessage(data, isBinary)
                if (message.action === name) {
                    resolve(message.data as T)
                } else {
                    reject(
                        `Received unexpected message '${message.action}' instead of '${name}'`,
                    )
                }
            }
            const handlerError = (err: string) => {
                this.ws?.off("message", handleMessage)
                reject(err)
            }

            this.ws?.once("message", handleMessage)
            this.ws?.once("error", handlerError)
        })
    }

    /**
     *
     * @param name
     * @returns
     */
    async connect(name: string = ""): Promise<boolean> {
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

                    this.send("register-player", { name })
                    this.ws.on("error", this.handleErrorBind)
                }

                resolve(true)
            })

            this.ws.once("close", (code, reason) => {
                console.log("WebSocket closed", code, reason)
            })

            this.ws.once("error", handleFailedToConnect)
        })
    }

    /**
     *
     * @param name
     * @param sessionDescription
     * @param options
     * @returns
     */
    async host(
        name: string,
        sessionDescription: RTCSessionDescription,
        options?: Omit<GameOptions, "name">,
    ): Promise<GameRecord> {
        // send "host-game", {name ,...options}
        return new Promise(async (resolve, reject) => {
            this.send("host-game", { name, options, sessionDescription })

            this.waitForMessage<GameRecord>("host-game-response").then(
                resolve,
                reject,
            )
        })
    }

    /**
     *
     * @param name
     */
    delete(name: string) {
        this.send("delete-game", { name })
    }

    /**
     *
     */
    async list(): Promise<GameRecord[]> {
        return new Promise(async (resolve, reject) => {
            this.send("list-games")

            this.waitForMessage<GameRecord[]>("list-games-response").then(
                resolve,
                reject,
            )
        })
    }

    /**
     *
     * @param game
     * @returns
     */
    async join(game: GameRecord): Promise<GameRecord> {
        return Promise.reject()
    }

    disconnect() {
        if (this.ws) {
            this.ws.off("error", this.handleErrorBind)
            this.ws.close()
        }
    }

    private send(name: string, data?: Object) {
        if (this.ws) {
            this.ws.send(
                JSON.stringify({
                    action: name,
                    data: data,
                }),
            )
        }
    }

    private handleMessage(data: RawData, isBinary: boolean): Message {
        console.log("WebSocket message", data.toString().length, isBinary)

        let json
        try {
            json = JSON.parse(data.toString())
        } catch (err) {}

        return json as Message
    }

    private handleError(error: string) {
        console.log("WebSocket error", error)
    }
}

let games
let hosted

// test
const ss = new SignalingServerConnection("127.0.0.1:9001")
await ss.connect("TestA")
games = await ss.list()
console.log("Games:", games)
hosted = await ss.host("MyGame", "abc", { maxPlayers: 2 })
console.log("Hosted", hosted)
games = await ss.list()
console.log("Games:", games)
await ss.delete("MyGame")
console.log("Games:", games)

setTimeout(() => ss.disconnect(), 5000)
