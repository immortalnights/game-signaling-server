import { App, DEDICATED_COMPRESSOR_3KB } from "uWebSockets.js"

const app = App({})
    .ws("/*", {
        idleTimeout: 32,
        maxBackpressure: 1024,
        maxPayloadLength: undefined, // default
        compression: DEDICATED_COMPRESSOR_3KB,

        open(ws) {
            console.log("Client connected")
        },

        message: (ws, message, isBinary) => {
            console.log("Client message", message.byteLength)
            ws.send("ok", true, true)
        },

        close(ws, code, message) {
            console.log("Client disconnected")
        },
    })
    .get("/*", (res, req) => {
        res.writeStatus("400 OK").end("Websocket Server Only")
    })
    .listen(9001, (listenSocket) => {
        if (listenSocket) {
            console.log("Listening to port 9001")
        }
    })
