import { RTCSessionDescription, RTCIceCandidate } from "werift"
import {
    PlayerRecord,
    RoomRecord,
    GameOptions,
    ServerMessageHandler,
    ServerReplyData,
    throwError,
} from "../signalingserver/index.js"
import { Room } from "./Room.js"
import { LocalPlayer } from "./LocalPlayer.js"
import { SignalingServerConnection } from "./SignalingServerConnection.js"

type LobbyMessageTypes =
    | "server-error"
    | "lobby-player-connected"
    | "lobby-player-disconnected"
    | "lobby-room-created"
    | "lobby-room-deleted"

export class Lobby {
    // local player's websocket connection
    private ws?: SignalingServerConnection
    private player?: LocalPlayer
    room?: Room

    constructor(address: string) {
        this.ws = new SignalingServerConnection(address)
        this.ws.subscribe({
            "server-error": this.handleServerErrorLobby,
            "lobby-player-connected": this.handlePlayerConnected,
            "lobby-player-disconnected": this.handlePlayerDisconnected,
            "lobby-room-created": this.handleRoomCreated,
            "lobby-room-deleted": this.handleRoomDeleted,
        } satisfies Pick<ServerMessageHandler, LobbyMessageTypes>)
    }

    get connected() {
        return this.player
    }

    private handleServerErrorLobby: ServerMessageHandler["server-error"] = (
        data,
    ) => {
        console.error("Server error", data.error)
    }

    private handlePlayerConnected: ServerMessageHandler["lobby-player-connected"] =
        (data) => {
            console.log("Player connected", data)
        }

    private handlePlayerDisconnected: ServerMessageHandler["lobby-player-disconnected"] =
        (data) => {
            console.log("Player disconnected", data)
        }

    private handleRoomCreated: ServerMessageHandler["lobby-room-created"] = (
        data,
    ) => {
        console.log("Game room created", data)
    }

    private handleRoomDeleted: ServerMessageHandler["lobby-room-deleted"] = (
        data,
    ) => {
        console.log("Game room deleted", data)
    }

    async connect(player: LocalPlayer, timeout: number = 30000): Promise<void> {
        this.player = player

        await this.ws?.connect(timeout)
        this.ws?.send("player-join-lobby", { name: player.name })
        const resp = await this.ws?.waitForMessage<PlayerRecord>(
            "player-join-lobby-reply",
            5000,
        )

        this.player.id = resp?.id
    }

    disconnect() {
        this.ws?.disconnect()
    }

    /**
     * Host a game (room)
     * @param name
     * @param options
     * @returns
     */
    async host(name: string, options?: GameOptions): Promise<Room> {
        if (!this.player) {
            throw new Error("Lobby missing local player")
        }

        this.ws?.send("player-host-game", {
            name,
            options,
        })

        type ReplyMessageData = ServerReplyData<"player-host-game-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-host-game-reply",
        )) as unknown as RoomRecord

        this.player.host = true

        this.room = new Room(this.ws!, data, this.player)
        return this.room
    }

    /**
     *
     * @returns
     */
    async list(): Promise<RoomRecord[]> {
        if (!this.player) {
            throw new Error("Lobby missing local player")
        }

        this.ws?.send("player-list-rooms")

        type ReplyMessageData = ServerReplyData<"player-list-rooms-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-list-rooms-reply",
        )) as unknown as { rooms: RoomRecord[] }

        return data ? data.rooms : []
    }

    /**
     * Join a game (room)
     * @param game
     * @returns
     */
    async join(room: RoomRecord): Promise<Room> {
        if (!this.player) {
            throw new Error("Lobby missing local player")
        }

        const host =
            room.players.find((player) => player.host) ??
            throwError("Failed to find host")

        this.ws?.send("player-join-room", {
            room: room.id,
        })

        type ReplyMessageData = ServerReplyData<"player-join-room-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-join-room-reply",
        )) as unknown as RoomRecord

        this.room = new Room(this.ws!, data, this.player)
        return this.room
    }
}
