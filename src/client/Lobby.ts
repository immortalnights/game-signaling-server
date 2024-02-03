import {
    PlayerRecord,
    RoomRecord,
    GameOptions,
    SignalingServerConnection,
} from "../signalingserver/index.js"
import {
    ServerMessageHandler,
    ServerReplyData,
} from "../signalingserver/message.js"
import { Room } from "./Room.js"
import { LocalPlayer } from "../LocalPlayer.js"
import { throwError } from "../signalingserver/utils.js"

type LobbyMessageTypes =
    | "server-error"
    | "lobby-player-connected"
    | "lobby-player-disconnected"
    | "lobby-game-created"
    | "lobby-game-deleted"

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
            "lobby-game-created": this.handleGameRoomCreated,
            "lobby-game-deleted": this.handleGameRoomDeleted,
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

    private handleGameRoomCreated: ServerMessageHandler["lobby-game-created"] =
        (data) => {
            console.log("Game room created", data)
        }

    private handleGameRoomDeleted: ServerMessageHandler["lobby-game-deleted"] =
        (data) => {
            console.log("Game room deleted", data)
        }

    async connect(
        player: LocalPlayer,
        timeout: number = 30000,
    ): Promise<PlayerRecord | undefined> {
        this.player = player

        await this.ws?.connect(timeout)
        this.ws?.send("player-join-lobby", { name: player.name })
        return await this.ws?.waitForMessage<PlayerRecord>(
            "player-join-lobby-reply",
            5000,
        )
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
    async host(name: string, options?: GameOptions): Promise<void> {
        if (!this.player) {
            throw new Error("Lobby missing local player")
        }

        const sessionDescription = await this.player.peerConnection.offer()

        this.ws?.send("player-host-game", { name, options, sessionDescription })

        type ReplyMessageData = ServerReplyData<"player-host-game-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-host-game-reply",
        )) as unknown as RoomRecord

        // console.assert()

        this.room = new Room(this.ws!, data, this.player, true)
    }

    /**
     *
     * @returns
     */
    async list(): Promise<RoomRecord[]> {
        if (!this.player) {
            throw new Error("Lobby missing local player")
        }

        this.ws?.send("player-list-games")

        type ReplyMessageData = ServerReplyData<"player-list-games-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-list-games-reply",
        )) as unknown as { games: RoomRecord[] }

        return data ? data.games : []
    }

    /**
     * Join a game (room)
     * @param game
     * @returns
     */
    async join(room: RoomRecord): Promise<void> {
        if (!this.player) {
            throw new Error("Lobby missing local player")
        }

        const host =
            room.players.find((player) => player.host) ??
            throwError("Failed to find host")

        if (!host.sessionDescription) {
            throw Error("Room host does not have peer connection")
        }

        const answer = await this.player.peerConnection.answer(
            host.sessionDescription,
        )

        this.ws?.send("player-join-game", { id: room.id, answer })

        type ReplyMessageData = ServerReplyData<"player-join-game-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-join-game-reply",
        )) as unknown as RoomRecord

        this.room = new Room(this.ws!, data, this.player, false)
    }

    /**
     *
     * @param name
     */
    async delete(name: string) {
        this.ws?.send("player-delete-game", { id: name })
    }
}
