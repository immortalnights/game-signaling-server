import {
    App,
    DEDICATED_COMPRESSOR_3KB,
    WebSocket,
    WebSocketBehavior,
} from "uWebSockets.js"

let theApp

export type UserData = { id: string }
export type SocketOpenCallback = WebSocketBehavior<UserData>["open"]
export type SocketMessageCallback = WebSocketBehavior<UserData>["message"]
export type SocketCloseCallback = WebSocketBehavior<UserData>["close"]
export interface SocketCallbacks {
    onOpen: SocketOpenCallback
    onMessage: SocketMessageCallback
    onClose: SocketCloseCallback
}

export const app = (
    { onOpen, onMessage, onClose }: SocketCallbacks,
    port: number = 9001,
) => {
    theApp = App({})
        .ws<UserData>("/*", {
            idleTimeout: 32,
            maxBackpressure: 1024,
            maxPayloadLength: undefined, // default
            compression: DEDICATED_COMPRESSOR_3KB,

            open: onOpen,
            message: onMessage,
            close: onClose,
        })
        .get("/*", (res, req) => {
            res.writeStatus("400 OK").end("Websocket Server Only")
        })
        .listen(port, (listenSocket) => {
            if (listenSocket) {
                console.log("Listening to port 9001.")
            }
        })
}
