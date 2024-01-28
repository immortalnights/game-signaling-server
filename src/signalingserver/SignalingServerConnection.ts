import { WebSocket, RawData } from "ws"
import { EventEmitter } from "node:events"
import {
    ClientMessages,
    ServerMessageHandler,
    ServerMessages,
    ServerReplyMessages,
} from "./message.js"

export class SignalingServerConnection extends EventEmitter {
    private ws?: WebSocket
    address: string
    private handleErrorBind: (error: string) => void
    private subscriptions: Partial<ServerMessageHandler>

    constructor(address: string) {
        super()
        this.address = address
        this.handleErrorBind = this.handleError.bind(this)
        this.subscriptions = {}
    }

    get connected() {
        return this.ws?.readyState === WebSocket.OPEN
    }

    subscribe(handlers: Partial<ServerMessageHandler>) {
        this.subscriptions = { ...this.subscriptions, ...handlers }
    }

    /**
     *FIXME replace with subscription!
     * @param name
     * @returns
     */
    async waitForMessage<T>(
        name: keyof ServerReplyMessages,
        timeout: number = 30000,
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            const handleMessage = (data: RawData, isBinary: boolean) => {
                this.ws?.off("error", this.handleError)

                const message = this.handleMessageOLD(data, isBinary)
                if (message.name === name) {
                    if (message.success) {
                        console.debug(`Received message '${name}'`)
                        resolve(message.data as any)
                    } else {
                        reject(message.error)
                    }
                } else {
                    console.debug(`Ignored unexpected message ${message.name}`)
                }
            }

            const handlerError = (err: string) => {
                this.ws?.off("message", handleMessage)
                reject(err)
            }

            console.debug(`Waiting for '${name}'`)
            this.ws?.on("message", handleMessage)
            this.ws?.once("error", handlerError)
        })
    }

    /**
     *
     * @param name
     * @returns
     */
    async connect(timeout: number = 30000): Promise<boolean> {
        // FIXME connect with timeout, register, wait for registration response
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(`ws://${this.address}/`, {})

            const handleFailedToConnect = (err: string) => {
                console.log("WebSocket error", err)
                reject(err)
            }

            this.ws.once("open", () => {
                console.debug("WebSocket opened")

                if (this.ws) {
                    this.ws.off("error", handleFailedToConnect)

                    this.ws.on("error", this.handleErrorBind)
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
            this.ws.removeAllListeners()
            this.ws.close()
        }
    }

    send<T extends keyof ClientMessages>(
        name: T,
        data?: ClientMessages[T]["data"],
    ) {
        if (this.ws) {
            this.ws.send(
                JSON.stringify({
                    name,
                    data: data,
                }),
            )
        }
    }

    private handleMessageOLD(data: RawData, isBinary: boolean): any {
        console.log("WebSocket message", data.toString().length, isBinary)

        let json
        try {
            json = JSON.parse(data.toString())
        } catch (err) {}

        return json as any
    }

    private handleMessage(data: RawData, isBinary: boolean): any {
        const message = JSON.parse(data.toString())
        if ("name" in message) {
            console.debug("Received", message.name)

            const name = message.name as keyof ServerMessageHandler
            if (this.subscriptions[name]) {
                // Unsure why the check is not preventing the TS error
                this.subscriptions[name]!(message.data as any)
            } else {
                console.debug(`No handler for '${name}'`)
            }
        } else {
            console.error("Message received without a name, discarded")
        }
    }

    private handleError(error: string) {
        console.log("WebSocket error", error)
    }
}
