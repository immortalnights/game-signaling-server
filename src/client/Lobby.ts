import {
    PlayerRecord,
    GameRecord,
    GameOptions,
    SignalingServerConnection,
} from "../signalingserver/index.js"
import {
    ServerMessageHandler,
    ServerReplyData,
    ServerReplyMessages,
} from "../signalingserver/message.js"
import { RTCSessionDescription } from "werift"
import { Prettify } from "../signalingserver/utils.js"
import { RawData } from "ws"
import { Room } from "./Room.js"
import { Player } from "../Player.js"

type LobbyMessageTypes =
    | "server-error"
    | "lobby-player-connected"
    | "lobby-player-disconnected"
    | "lobby-game-created"

export class Lobby {
    // local player's websocket connection
    private ws?: SignalingServerConnection
    private player: Player
    private room?: GameRecord

    constructor(address: string, player: Player) {
        this.ws = new SignalingServerConnection(address)
        this.player = player

        this.ws.subscribe({
            "server-error": this.handleServerErrorLobby,
            "lobby-player-connected": this.handlePlayerConnected,
            "lobby-player-disconnected": this.handlePlayerDisconnected,
            "lobby-game-created": this.handleGameCreated,
        } satisfies Pick<ServerMessageHandler, LobbyMessageTypes>)
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

    private handleGameCreated: ServerMessageHandler["lobby-game-created"] = (
        data,
    ) => {
        console.log("Player connected", data)
    }

    async connect(
        id: string,
        name: string,
        timeout: number = 30000,
    ): Promise<PlayerRecord | undefined> {
        await this.ws?.connect(timeout)
        this.ws?.send("player-join-lobby", { name })
        return await this.ws?.waitForMessage<PlayerRecord>(
            "player-join-lobby-reply",
            5000,
        )
    }

    disconnect() {
        this.ws?.disconnect()
    }

    /**
     *
     * @param name
     * @param sessionDescription
     * @param options
     * @returns
     */
    async host(
        name: string,
        sessionDescription: RTCSessionDescription,
        options?: GameOptions,
    ): Promise<void> {
        // send "host-game", {name ,...options}
        this.ws?.send("player-host-game", { name, options, sessionDescription })

        type ReplyMessageData = ServerReplyData<"player-host-game-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-host-game-reply",
        )) as unknown as GameRecord

        this.room = new Room(this.ws!, this.player, true, data)
    }

    /**
     *
     * @returns
     */
    async list(): Promise<GameRecord[]> {
        this.ws?.send("player-list-games")

        type ReplyMessageData = ServerReplyData<"player-list-games-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-list-games-reply",
        )) as unknown as { games: GameRecord[] }

        return data ? data.games : []
    }

    /**
     *
     * @param game
     * @returns
     */
    async join(
        game: GameRecord,
        sessionDescription: RTCSessionDescription,
    ): Promise<void> {
        this.ws?.send("player-join-game", { id: game.id, sessionDescription })

        type ReplyMessageData = ServerReplyData<"player-join-game-reply">

        const data = (await this.ws?.waitForMessage<ReplyMessageData>(
            "player-join-game-reply",
        )) as unknown as GameRecord

        this.room = new Room(this.ws!, this.player, false, data)
    }

    /**
     *
     * @param name
     */
    async delete(name: string) {
        this.ws?.send("player-delete-game", { id: name })
    }
}
