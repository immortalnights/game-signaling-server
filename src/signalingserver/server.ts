import { App, DEDICATED_COMPRESSOR_3KB, WebSocket } from "uWebSockets.js"
import { randomString } from "../utilities.js"
import { RTCSessionDescription } from "werift"

interface Game {
    name: string
    players: {
        name: string
        socket: WebSocket<{ id: string }>
        sessionDescription: RTCSessionDescription
        host: boolean
    }[]
}

const gameServerIndex: Game[] = []

const app = App({})
    .ws<{ id: string }>("/*", {
        idleTimeout: 32,
        maxBackpressure: 1024,
        maxPayloadLength: undefined, // default
        compression: DEDICATED_COMPRESSOR_3KB,

        open(ws) {
            console.log("Client connected")
            const userData = ws.getUserData()
            userData.id = randomString()
        },

        message: (ws, message, isBinary) => {
            let data = JSON.parse(Buffer.from(message).toString())

            console.log("Client message", data.action)

            switch (data.action) {
                case "host-game": {
                    if (data.id && data.sessionDescription) {
                        gameServerIndex.push({
                            name: data.id,
                            players: [
                                {
                                    name: ws.getUserData().id,
                                    socket: ws,
                                    sessionDescription: data.sessionDescription,
                                    host: true,
                                },
                            ],
                        })

                        console.debug("Game registered")
                    } else {
                        console.error("Missing required host data")
                    }
                    break
                }
                case "list-games": {
                    const availableGames = gameServerIndex
                        .filter((game) => game.players.length === 1)
                        .map((game) => {
                            const host = game.players.find(
                                (player) => player.host,
                            )

                            if (!host) {
                                throw Error(
                                    `Failed to find host for game ${game.name}`,
                                )
                            }

                            return {
                                name: game.name,
                                host: host.name,
                                sessionDescription: host.sessionDescription,
                            }
                        })

                    console.debug(
                        `Have ${availableGames.length} available games`,
                    )

                    ws.send(
                        JSON.stringify({
                            action: "game-list",
                            data: availableGames,
                        }),
                        false,
                        true,
                    )
                    break
                }
                case "joined-game": {
                    console.log("Joined game", data.id)

                    const game = gameServerIndex.find(
                        (game) => game.name === data.id,
                    )
                    if (game) {
                        // TODO check player count

                        const host = game.players.find((player) => player.host)

                        if (!host) {
                            throw Error(
                                `Failed to find host for game ${game.name}`,
                            )
                        }

                        host.socket.send(
                            JSON.stringify({
                                action: "opponent-joined",
                                player: ws.getUserData().id,
                                sessionDescription: data.sessionDescription,
                            }),
                        )

                        game.players.push({
                            name: ws.getUserData().id,
                            socket: ws,
                            sessionDescription: data.sessionDescription,
                            host: false,
                        })
                    }

                    break
                }
            }
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
