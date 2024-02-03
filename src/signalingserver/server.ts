import { RTCSessionDescription } from "werift"
import { WebSocket } from "uWebSockets.js"
import { throwError } from "./utils.js"
import { randomUUID } from "node:crypto"
import { ClientMessage, ClientMessages, ServerMessages } from "./message.js"
import { GameOptions, RoomRecord, PlayerRecord, RoomState } from "./types.js"
import { UserData, app } from "./app.js"

interface ServerPlayer extends PlayerRecord {
    ws: WebSocket<UserData>
    room?: string
}

export type ClientMessageHandler = {
    [K in keyof ClientMessages]: (
        player: ServerPlayer,
        data: ClientMessages[K]["data"],
    ) => ClientMessages[K]["reply"]
}

const broadcast = <T extends keyof ServerMessages>(
    players: ServerPlayer[],
    name: ServerMessages[T]["name"],
    data: ServerMessages[T]["data"],
    exclude: string[] = [],
) => {
    players.forEach((player) => {
        if (!exclude.includes(player.id)) {
            console.debug(`Broadcast ${name} to ${player.id}`)
            player.ws.send(
                JSON.stringify({
                    name,
                    data,
                }),
            )
        }
    })
}

// FIXME don't duplicate player data in Lobby and Room
class Room implements RoomRecord {
    id: string
    name: string
    state: RoomState
    options: GameOptions
    players: ServerPlayer[]

    constructor(name: string, options: GameOptions, host: ServerPlayer) {
        this.id = randomUUID()
        this.name = name
        this.state = RoomState.Open
        this.options = options
        this.players = [host]
    }

    get host(): ServerPlayer {
        return (
            this.players.find((player) => player.host) ??
            throwError("Failed to find host")
        )
    }

    join(player: ServerPlayer, sessionDescription: RTCSessionDescription) {
        player.room = this.id
        this.players.push({ ...player })

        broadcast(
            this.players,
            "room-player-connected",
            this.serializePlayer(player),
            [player.id],
        )
    }

    leave(player: ServerPlayer) {
        player.room = undefined

        const index = this.players.indexOf(player)
        if (index !== -1) {
            this.players.splice(index, 1)
            console.log(`Player '${player.name}' has left room '${this.name}'`)

            broadcast(this.players, "room-player-disconnected", {
                id: player.id,
            })

            if (this.players.length === 0) {
                console.debug(`Closing empty room '${this.name}'`)
                this.state = RoomState.Closed
            }
        } else {
            console.error(
                `Failed to find player '${player.name}' in room '${this.name}'`,
            )
        }
    }

    private serializePlayer(player: ServerPlayer): PlayerRecord {
        return {
            id: player.id,
            name: player.name,
            ready: player.ready,
            host: player.host,
            sessionDescription: player.host
                ? player.sessionDescription
                : undefined,
        }
    }

    serialize(): RoomRecord {
        const host = this.host

        return {
            id: this.id,
            name: this.name,
            state: this.state,
            players: this.players.map(this.serializePlayer),
            options: this.options,
        }
    }
}

type LobbyMessageTypes =
    | "player-join-lobby"
    | "player-host-game"
    | "player-list-games"
    | "player-delete-game"
    | "player-join-game"
    | "player-leave-game"
    | "player-change-ready-state"
    | "player-start-game"

class Lobby {
    rooms: Room[]
    players: ServerPlayer[]
    private messageHandlers: Pick<ClientMessageHandler, LobbyMessageTypes>

    constructor() {
        this.rooms = []
        this.players = []

        this.messageHandlers = {
            "player-join-lobby": this.handlePlayerJoinLobby,
            "player-host-game": this.handlePlayerHostGame,
            "player-list-games": this.handlePlayerListGames,
            "player-delete-game": this.handlePlayerDeleteGame,
            "player-join-game": this.handlePlayerJoinGame,
            "player-leave-game": this.handlePlayerLeaveGame,
            "player-change-ready-state": this.handlePlayerChangeReadyState,
            "player-start-game": this.handlePlayerStartGame,
        }
    }

    getPlayer(ws: WebSocket<UserData>) {
        return (
            this.players.find((player) => player.ws === ws) ??
            throwError(`Player '${ws.getUserData().id}' is not registered`)
        )
    }

    join(player: ServerPlayer) {
        this.players.push(player)

        broadcast(
            this.players,
            "lobby-player-connected",
            {
                id: player.id,
                name: player.name,
            },
            [player.id],
        )
    }

    // Leave lobby (disconnect)
    leave(player: ServerPlayer) {}

    disconnected(ws: WebSocket<UserData>) {
        const index = this.players.findIndex((player) => player.ws === ws)
        if (index !== -1) {
            const player = this.players[index]
            this.players.splice(index, 1)

            if (player.room) {
                const roomIndex = this.rooms.findIndex(
                    (room) => room.id === player.room,
                )

                if (roomIndex !== -1) {
                    const room = this.rooms[roomIndex]
                    console.debug(
                        `Player '${player.name}' is in room '${room.name}'`,
                    )

                    room.leave(player)

                    if (room.state === RoomState.Closed) {
                        broadcast(this.players, "lobby-game-deleted", {
                            id: room.id,
                        })

                        this.players.forEach((lobbyPlayer) => {
                            if (lobbyPlayer.room === room.id) {
                                lobbyPlayer.room = undefined
                            }
                        })

                        this.rooms.splice(roomIndex, 1)
                    } else {
                        broadcast(this.players, "lobby-player-disconnected", {
                            id: player.id,
                        })
                    }
                }
            } else {
                console.debug(`Player '${player.name}' was not in a room'`)
                broadcast(this.players, "lobby-player-disconnected", {
                    id: player.id,
                })
            }
        } else {
            console.error("Failed to find ServerPlayer for disconnected player")
        }
    }

    handleMessage(ws: WebSocket<UserData>, message: ClientMessage): void {
        let player
        if (message.name === "player-join-lobby") {
            // TODO check the player doesn't already exist

            player = {
                ws,
                id: ws.getUserData().id,
                name: "noname",
                host: false,
                ready: false,
                sessionDescription: undefined,
            } satisfies ServerPlayer
        } else {
            player = lobby.getPlayer(ws)
        }

        const name = message.name as LobbyMessageTypes
        if (this.messageHandlers[name]) {
            let response = this.messageHandlers[name](
                player,
                message.data as any,
            )

            if (response) {
                console.debug("Reply", response)
                player.ws.send(JSON.stringify(response))
            } else {
                console.debug("No reply provided for", message.name)
            }
        }
    }

    private handlePlayerJoinLobby: ClientMessageHandler["player-join-lobby"] = (
        player: ServerPlayer,
        { name },
    ) => {
        type Reply = ClientMessages["player-join-lobby"]["reply"]

        this.join(player)
        return {
            name: "player-join-lobby-reply" as const,
            success: true,
            data: {
                id: player.id,
            },
        } satisfies Reply
    }

    private handlePlayerHostGame: ClientMessageHandler["player-host-game"] = (
        player,
        { name, options, sessionDescription },
    ) => {
        type Reply = ClientMessages["player-host-game"]["reply"]

        // Must update host with sessionDescription as room copies PlayerRecord
        player.sessionDescription = sessionDescription

        const room = new Room(
            name,
            { maxPlayers: 2, minPlayers: 2, ...options },
            player,
        )

        // Update the player details
        player.room = room.id
        player.host = true

        this.rooms.push(room)

        // TODO broadcast to all connected clients (to avoid polling)

        return {
            name: "player-host-game-reply" as const,
            success: true,
            data: room.serialize(),
        } satisfies Reply
    }

    private handlePlayerListGames: ClientMessageHandler["player-list-games"] = (
        player,
    ) => {
        type Reply = ClientMessages["player-list-games"]["reply"]

        const games = this.rooms.map((room) => room.serialize())

        return {
            name: "player-list-games-reply" as const,
            success: true,
            data: { games },
        } satisfies Reply
    }

    private handlePlayerDeleteGame: ClientMessageHandler["player-delete-game"] =
        (player, { id: gameId }) => {
            //TODO broadcast
        }

    private handlePlayerJoinGame: ClientMessageHandler["player-join-game"] = (
        player,
        { id: gameId, sessionDescription },
    ) => {
        type Reply = ClientMessages["player-join-game"]["reply"]

        const room = this.rooms.find((room) => room.id === gameId)

        let reply
        if (room) {
            if (room.players.length < room.options.maxPlayers) {
                room.join(player, sessionDescription)

                reply = {
                    name: "player-join-game-reply",
                    success: true,
                    data: room.serialize(),
                } satisfies Reply
            } else {
                reply = {
                    name: "player-join-game-reply" as const,
                    success: false,
                    error: "Cannot join room, room is full",
                } satisfies Reply
            }
        } else {
            reply = {
                name: "player-join-game-reply" as const,
                success: false,
                error: "Room does not exist",
            } satisfies Reply
        }

        return reply
    }

    private handlePlayerLeaveGame: ClientMessageHandler["player-leave-game"] = (
        player,
    ) => {}

    private handlePlayerChangeReadyState: ClientMessageHandler["player-change-ready-state"] =
        (player, { id, ready }) => {
            console.assert(player.id === id, "Mismatch player ID")
            console.assert(player.room, "Player is not a member of a room")
            player.ready = ready

            const room = this.rooms.find((room) => room.id === player.room)
            if (room) {
                broadcast(
                    room.players,
                    "room-player-ready-change",
                    { id, ready },
                    [player.id],
                )
            }
        }

    private handlePlayerStartGame: ClientMessageHandler["player-start-game"] = (
        player,
    ) => {
        console.assert(player.host, "None host attempted to start game")
        console.assert(player.room, "Player is not a member of a room")

        if (player.host) {
            const room = this.rooms.find((room) => room.id === player.room)
            if (room) {
                broadcast(room.players, "room-start-game", { id: room.id }, [
                    player.id,
                ])
            }
        }
    }
}

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
            lobby.handleMessage(ws, message)
        } else {
            console.error("Message received without a name, discarded")
        }
    },
    onClose(ws, code, message) {
        console.log("Client disconnected", code, message)
        lobby.disconnected(ws)
    },
})
