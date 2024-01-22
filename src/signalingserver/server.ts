import { App, DEDICATED_COMPRESSOR_3KB, WebSocket } from "uWebSockets.js"
import { randomString } from "../utilities.js"
import { RTCSessionDescription } from "werift"
import {
    ErrorResponse,
    GameDescription,
    GameOptions,
    GameRecord,
    Message,
    MessageInterface,
    MessageType,
    PlayerRecord,
    ServerResponseMessages,
} from "./types.js"

interface UserData {
    id: string
}

interface ServerPlayerRecord extends PlayerRecord {
    socket: WebSocket<{ id: string }>
}

interface ServerGameRecord extends GameRecord {
    name: string
    players: ServerPlayerRecord[]
}

class GameManager {
    games: ServerGameRecord[]

    constructor() {
        this.games = []
    }

    private serializeGame(game: ServerGameRecord) {
        return {
            ...game,
            players: game.players.map((player) => {
                return {
                    name: player.name,
                    sessionDescription: player.host
                        ? player.sessionDescription
                        : undefined,
                    host: player.host,
                }
            }),
        } satisfies GameRecord
    }

    get availableGames() {
        return this.games
            .filter((game) => game.players.length < game.options.maxPlayers)
            .map((game) => this.serializeGame(game))
    }

    host(
        socket: WebSocket<UserData>,
        name: string,
        sessionDescription: RTCSessionDescription,
        options: GameOptions,
    ): GameRecord {
        const gameRecord = {
            id: randomString(8),
            name: name,
            options,
            players: [
                {
                    name: socket.getUserData().id,
                    socket,
                    sessionDescription,
                    host: true,
                } satisfies ServerPlayerRecord,
            ],
        } satisfies ServerGameRecord

        console.log("hosted", gameRecord)

        this.games.push(gameRecord)

        return this.serializeGame(gameRecord)
    }

    join(
        ws: WebSocket<UserData>,
        game: ServerGameRecord,
        data: MessageInterface["join-game"]["data"],
    ) {
        const host = game.players.find((player) => player.host)
        const newPlayerId = ws.getUserData().id

        if (!host) {
            throw Error(`Failed to find host for game ${game.name}`)
        }

        const playerRecord = {
            name: newPlayerId,
            host: false,
            sessionDescription: data.sessionDescription,
        }

        const existingPlayers = [...game.players]

        // Add the player to the game
        game.players.push({
            ...playerRecord,
            socket: ws,
        } satisfies ServerPlayerRecord)

        // Send the game to the new player
        ws.send(
            JSON.stringify({
                action: "join-game-response",
                data: game,
            } satisfies MessageInterface["join-game-response"]),
        )

        // Send the player to the other players
        existingPlayers.map((player) => {
            player.socket.send(
                JSON.stringify({
                    action: "player-joined",
                    data: playerRecord,
                } satisfies MessageInterface["player-joined"]),
            )
        })
    }

    delete(game: ServerGameRecord) {
        const index = this.games.indexOf(game)

        if (index !== -1) {
            const deleted = this.games.splice(index, 1)
            console.debug("deleted", deleted)
        }
    }
}

const sendResponse = (
    ws: WebSocket<UserData>,
    name: keyof ServerResponseMessages,
    data?: object,
) =>
    ws.send(
        JSON.stringify({
            action: name,
            data,
        }),
    )

interface ClientMessageHandlers {
    "register-player": (data: unknown) => Object | ErrorResponse
    "host-game": (
        ws: WebSocket<UserData>,
        data: GameDescription,
    ) => GameRecord | ErrorResponse
    "delete-game": (data: { name: string }) => undefined | ErrorResponse
    "list-games": () => GameRecord[]
    "join-game": (
        ws: WebSocket<UserData>,
        data: {
            id: string
            sessionDescription: RTCSessionDescription
        },
    ) => GameRecord | ErrorResponse
}

const clientMessageHandlers: ClientMessageHandlers = {
    "register-player": (data) => {
        return {
            msg: "Unimplemented",
        }
    },
    "host-game": (ws, data) => {
        let response
        if (data.name && data.sessionDescription) {
            const gameRecord = gameManager.host(
                ws,
                data.name,
                data.sessionDescription,
                data.options,
            )

            response = gameRecord

            console.debug("Game registered")
        } else {
            console.error("Missing required host data")
            response = { msg: "Missing required game data" }
        }

        return response
    },
    "delete-game": (data) => {
        return {
            msg: "Unimplemented",
        }
        // const realMessage = msg as Message<{ name: string }>
        // const gameName = realMessage.data.name
        // console.log("delete game", gameName)
        // const game = gameManager.games.find(
        //     (game) => game.name === gameName,
        // )
        // if (game) {
        //     const host = game.players.find((player) => player.host)
        //     if (host && host.socket === ws) {
        //         gameManager.delete(game)
        //     } else {
        //         console.error(
        //             `Attempt to delete game from non-host '${
        //                 ws.getUserData().id
        //             }'`,
        //         )
        //     }
        // } else {
        //     console.error(`Failed to find game '${gameName}'`)
        // }
    },
    "list-games": () => {
        console.debug(
            `Have ${gameManager.availableGames.length} available games`,
        )

        return gameManager.availableGames
    },
    "join-game": (ws, data) => {
        return {
            msg: "Unimplemented",
        }
        // const realMessage = msg as MessageInterface["join-game"]
        // console.log("Joined game", realMessage.data.id)
        // const game = gameManager.games.find(
        //     (game) => game.name === realMessage.data.id,
        // )
        // if (game) {
        //     if (game.players.length < game.options.maxPlayers) {
        //         gameManager.join(ws, game, realMessage.data)
        //     } else {
        //         console.error(
        //             `Cannot join game '${realMessage.data.id}', game full`,
        //         )
        //         sendError(ws, "join-game-response", "Failed to join, game full")
        //     }
        // } else {
        //     console.error(`Failed to find game '${realMessage.data.id}'`)
        //     sendError(
        //         ws,
        //         "join-game-response",
        //         "Failed to join, game not found",
        //     )
        // }
    },
}

const gameManager = new GameManager()

type SocketMessageCallback = (
    ws: WebSocket<UserData>,
    message: ArrayBuffer,
    isBinary: boolean,
) => void | Promise<void>

const handleMessage: SocketMessageCallback = (ws, message, isBinary) => {
    const rawMessage = JSON.parse(
        Buffer.from(message).toString(),
    ) as Message<unknown>

    console.log("Client message", rawMessage.action)

    const validMessages = Object.keys(clientMessageHandlers)
    if (!validMessages.includes(rawMessage.action)) {
        throw Error(`Received unexpected message '${rawMessage.action}'`)
        //     const resp = clientMessageHandlers[rawMessage.action](
        //         ws,
        //         rawMessage.data as GameDescription,
        //     )
        //     sendResponse(ws, "host-game-response", resp)
    }

    switch (rawMessage.action) {
        case "register-player": {
            break
        }
        case "host-game": {
            const response = clientMessageHandlers["host-game"](
                ws,
                rawMessage.data as GameDescription,
            )
            sendResponse(ws, "host-game-response", response)
            break
        }
        case "delete-game": {
            const response = clientMessageHandlers["delete-game"](
                rawMessage.data as { name: string },
            )
            sendResponse(ws, "delete-game-response", response)
            break
        }
        case "list-games": {
            const response = clientMessageHandlers["list-games"]()

            sendResponse(ws, "list-games-response", response)
            break
        }
        case "join-game": {
            const response = clientMessageHandlers["join-game"](
                ws,
                rawMessage.data as {
                    id: string
                    sessionDescription: RTCSessionDescription
                },
            )
            sendResponse(ws, "join-game-response", response)
            break
        }
    }
}

const app = App({})
    .ws<UserData>("/*", {
        idleTimeout: 32,
        maxBackpressure: 1024,
        maxPayloadLength: undefined, // default
        compression: DEDICATED_COMPRESSOR_3KB,

        open(ws) {
            console.log("Client connected")
            const userData = ws.getUserData()
            userData.id = randomString()
        },

        message: handleMessage,

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
