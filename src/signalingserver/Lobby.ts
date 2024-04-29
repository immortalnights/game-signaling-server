import { randomUUID } from "node:crypto"
import { Room } from "./Room.js"
import type { ServerPlayer } from "./ServerPlayer.js"
import type { UserData } from "./app.js"
import type { ClientMessage, ClientMessages } from "./message.js"
import { WebSocket } from "uWebSockets.js"
import { deleteItemFromArray, throwError } from "./utilities.js"
import { broadcast, sendTo } from "./broadcast.js"
import { RoomState } from "./states.js"

export type ClientMessageHandler = {
    [K in keyof ClientMessages]: (
        player: ServerPlayer,
        body: ClientMessages[K]["body"],
    ) => ClientMessages[K]["reply"]
}

export class Lobby {
    rooms: Room[]
    players: ServerPlayer[]
    private messageHandlers: Partial<ClientMessageHandler>

    constructor() {
        this.rooms = []
        this.players = []

        this.messageHandlers = {
            "player-join-lobby": this.handlePlayerJoinLobby,
            "player-leave-lobby": this.handlePlayerLeaveLobby,
            "player-host-game": this.handlePlayerHostGame,
            "player-list-players": this.handlePlayerListPlayers,
            "player-list-rooms": this.handlePlayerListRooms,
            "player-join-room": this.handlePlayerJoinRoom,
            "player-leave-room": this.handlePlayerLeaveRoom,
            "player-change-ready-state": this.handlePlayerChangeReadyState,
            "player-connect-to-peer": this.handlePlayerConnectToPeer,
            "player-connect-to-host": this.handlePlayerConnectToHost,
            "player-start-game": this.handlePlayerStartGame,
        }
    }

    getPlayer(ws: WebSocket<UserData>) {
        return (
            this.players.find((player) => player.ws === ws) ??
            throwError(`Player '${ws.getUserData().id}' is not registered`)
        )
    }

    // Join the lobby
    join(player: ServerPlayer) {
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

    createRoom(player: ServerPlayer, room: Room) {
        this.rooms.push(room)

        broadcast(this.players, "lobby-room-created", room.serialize(), [
            player.id,
        ])
    }

    deleteRoom(room: Room) {
        deleteItemFromArray(this.rooms, room)

        broadcast(this.players, "lobby-room-deleted", {
            id: room.id,
            name: room.name,
        })
    }

    // Leave lobby (disconnect)
    leave(player: ServerPlayer) {
        deleteItemFromArray(this.players, player)

        if (player.room) {
            const room =
                this.rooms.find((room) => room.id === player.room) ??
                throwError(
                    `Failed to find room '${player.room}' for player '${player.id}'`,
                )

            console.debug(`Player '${player.name}' is in room '${room.name}'`)

            // Leaving one by one will cause a crash if two player leave at the same time.
            // Or if for some reason any 'player' has a disconnected socket.
            room.leave(player)

            if (room.state === RoomState.Closed) {
                this.deleteRoom(room)
            }
        } else {
            console.debug(`Player '${player.name}' was not in a room'`)
        }

        broadcast(
            this.players,
            "lobby-player-disconnected",
            {
                id: player.id,
                name: player.name,
            },
            [player.id],
        )
    }

    disconnected(ws: WebSocket<UserData>) {
        const player = this.players.find((player) => player.ws === ws)
        if (player) {
            this.leave(player)
        } else {
            console.debug("Failed to find ServerPlayer for disconnected player")
        }
    }

    handleMessage(ws: WebSocket<UserData>, message: ClientMessage): void {
        let player
        if (message.name === "player-join-lobby") {
            player = this.players.find((player) => player.ws === ws)

            if (!player) {
                console.debug("New player connected", message.body.name)
                player = {
                    ws,
                    id: ws.getUserData().id,
                    name: message.body.name,
                    host: false,
                    ready: false,
                    autoReady: false,
                } satisfies ServerPlayer

                // Awkward place to do this, but must ensure it's only ever done once.
                this.players.push(player)
            }
        } else {
            player = this.players.find((player) => player.ws === ws)
        }

        if (!player) {
            // Ignore the message if the player sends a message before officially
            // joining the lobby or after they have left.
            console.warn(`Ignored message ${message.name} from unknown player`)
        } else {
            const name = message.name as LobbyMessageTypes
            if (this.messageHandlers[name]) {
                let response = this.messageHandlers[name](
                    player,
                    message.body as any,
                )

                if (response) {
                    console.debug("Reply", response)
                    player?.ws.send(JSON.stringify(response))
                } else {
                    console.debug("No reply provided for", message.name)
                }
            }
        }
    }

    private handlePlayerJoinLobby: ClientMessageHandler["player-join-lobby"] = (
        player: ServerPlayer,
        { name },
    ) => {
        type Reply = ClientMessages["player-join-lobby"]["reply"]

        player.name = name

        this.join(player)
        return {
            name: "player-join-lobby-reply" as const,
            success: true,
            body: {
                id: player.id,
                name: player.name,
            },
        } satisfies Reply
    }

    private handlePlayerLeaveLobby: ClientMessageHandler["player-leave-lobby"] =
        (player: ServerPlayer) => {
            this.leave(player)
        }

    private handlePlayerHostGame: ClientMessageHandler["player-host-game"] = (
        player,
        { name, options, autoReady },
    ) => {
        type Reply = ClientMessages["player-host-game"]["reply"]

        // Must update host with sessionDescription as room copies PlayerRecord
        player.autoReady = autoReady ?? false
        player.ready = autoReady ?? false

        const room = new Room(
            name,
            { maxPlayers: 2, minPlayers: 2, ...options },
            player,
        )

        console.assert(player.host, "Player should now be a host!")

        this.createRoom(player, room)

        return {
            name: "player-host-game-reply" as const,
            success: true,
            body: room.serialize(),
        } satisfies Reply
    }

    private handlePlayerListPlayers: ClientMessageHandler["player-list-players"] =
        (player) => {
            console.log(`Have ${this.players.length} players in lobby`)
            return {
                name: "player-list-players-reply",
                success: true,
                body: { players: [] },
            }
        }

    private handlePlayerListRooms: ClientMessageHandler["player-list-rooms"] = (
        player,
    ) => {
        type Reply = ClientMessages["player-list-rooms"]["reply"]

        const rooms = this.rooms.map((room) => room.serialize())

        return {
            name: "player-list-rooms-reply" as const,
            success: true,
            body: { rooms },
        } satisfies Reply
    }

    private handlePlayerJoinRoom: ClientMessageHandler["player-join-room"] = (
        player,
        { room: roomId, autoReady },
    ) => {
        type Reply = ClientMessages["player-join-room"]["reply"]

        const room = this.rooms.find((room) => room.id === roomId)

        let reply
        if (room) {
            if (room.players.length < room.options.maxPlayers) {
                player.ready = autoReady ?? false
                room.join(player)

                reply = {
                    name: "player-join-room-reply",
                    success: true,
                    body: room.serialize(),
                } satisfies Reply
            } else {
                reply = {
                    name: "player-join-room-reply" as const,
                    success: false,
                    error: "Cannot join room, room is full",
                } satisfies Reply
            }
        } else {
            reply = {
                name: "player-join-room-reply" as const,
                success: false,
                error: "Room does not exist",
            } satisfies Reply
        }

        return reply
    }

    private handlePlayerLeaveRoom: ClientMessageHandler["player-leave-room"] = (
        player,
    ) => {
        console.assert(player.room, "Player is not a member of a room")
        const room = this.rooms.find((room) => room.id === player.room)
        if (room) {
            room.leave(player)

            if (room.state === RoomState.Closed) {
                this.deleteRoom(room)
            }
        }
    }

    private handlePlayerChangeReadyState: ClientMessageHandler["player-change-ready-state"] =
        (player, { ready }) => {
            console.assert(player.room, "Player is not a member of a room")
            player.ready = ready

            const room = this.rooms.find((room) => room.id === player.room)
            if (room) {
                broadcast(room.players, "room-player-ready-change", {
                    id: player.id,
                    ready,
                })
            }
        }

    private handlePlayerConnectToPeer: ClientMessageHandler["player-connect-to-peer"] =
        (player, { peer, offer, candidates }) => {
            console.assert(player.room, "Player is not a member of a room")
            const room = this.rooms.find((room) => room.id === player.room)
            if (room) {
                const otherPlayer = room.players.find((p) => p.id === peer)
                if (otherPlayer) {
                    console.debug("Sending host offer to peer")
                    sendTo(otherPlayer, "room-player-rtc-host-offer", {
                        id: player.id,
                        sessionDescription: offer,
                        candidates,
                    })
                }
            }
        }

    private handlePlayerConnectToHost: ClientMessageHandler["player-connect-to-host"] =
        (player, { answer }) => {
            console.assert(player.room, "Player is not a member of a room")
            const room = this.rooms.find((room) => room.id === player.room)
            if (room) {
                console.debug("Sending peer answer to host")
                sendTo(room.host, "room-player-rtc-answer", {
                    id: player.id,
                    sessionDescription: answer,
                })
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
                room.state = RoomState.Locked as RoomState

                const gameId = randomUUID()
                room.players.forEach((p) => {
                    p.game = gameId
                })

                broadcast(room.players, "room-start-game", {
                    room: room.id,
                    game: gameId,
                })

                room.players.forEach((p) => room.leave(p))

                // ts error if Locked state is not cast to RoomState
                if (room.state === RoomState.Closed) {
                    this.deleteRoom(room)
                }
            } else {
                console.error(`Player ${player.id} is in a room`)
            }
        } else {
            console.error(`Player ${player.id} is not the game host`)
        }
    }
}
