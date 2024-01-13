import { App, DEDICATED_COMPRESSOR_3KB } from "uWebSockets.js"

const app = App({})
    .ws("/*", {
        idleTimeout: 32,
        maxBackpressure: 1024,
        maxPayloadLength: 512,
        compression: DEDICATED_COMPRESSOR_3KB,

        open(ws) {},

        message: (ws, message, isBinary) => {
            let ok = ws.send(message, isBinary, true)
        },

        close(ws, code, message) {},
    })
    .get("/*", (res, req) => {
        res.writeStatus("400 OK").end("Websocket Server Only")
    })
    .listen(9001, (listenSocket) => {
        if (listenSocket) {
            console.log("Listening to port 9001")
        }
    })
