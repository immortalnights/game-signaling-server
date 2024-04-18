import { randomUUID } from "node:crypto"
import { app } from "./app.js"
import { Lobby } from "./Lobby.js"

const lobby = new Lobby()

app({
    onOpen(ws) {
        console.log("Client connected")
        ws.getUserData().id = randomUUID()
    },
    onMessage(ws, data, isBinary) {
        const message = JSON.parse(Buffer.from(data).toString())
        if ("name" in message) {
            console.debug(
                `Received ${message.name} from ${ws.getUserData().id}`,
            )
            try {
                lobby.handleMessage(ws, message)
            } catch (error) {
                console.trace(error)
            }
        } else {
            console.error("Message received without a name, discarded")
        }
    },
    onClose(ws, code, message) {
        console.log("Client disconnected", code, message)
        try {
            lobby.disconnected(ws)
        } catch (error) {
            console.trace(error)
        }
    },
})
