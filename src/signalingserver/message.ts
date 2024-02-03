import { RTCSessionDescription } from "werift"
import { GameOptions, RoomRecord, PlayerRecord } from "./types.js"
import { Prettify } from "./utils.js"

export interface ClientMessage {
    name: string
    data: unknown
    reply: ServerMessages
}

export type ServerMessage = {
    name: string
    data: unknown
}

export type ServerReplyMessage<Name, Data> = {
    name: Name
} & (
    | {
          success: true
          data: Data
      }
    | {
          success: false
          error: string
      }
)
export type GeneralServerReplyMessage =
    | ServerReplyMessage<keyof ServerReplyMessages, unknown>
    | undefined

/**
 * reply: message to wait for as verification of the request
 */
export interface ClientMessages {
    "player-join-lobby": {
        name: "player-join-lobby"
        data: { name: string }
        reply: ServerReplyMessages["player-join-lobby-reply"]
    }
    "player-host-game": {
        name: "player-host-game"
        data: {
            name: string
            options?: GameOptions
            sessionDescription: RTCSessionDescription
        }
        reply: ServerReplyMessages["player-host-game-reply"]
    }
    "player-list-games": {
        name: "player-list-games"
        data: void
        reply: ServerReplyMessages["player-list-games-reply"]
    }
    "player-delete-game": {
        name: "player-delete-game"
        data: { id: string }
        reply: undefined
    }
    "player-join-game": {
        name: "player-join-game"
        data: { id: string; sessionDescription: RTCSessionDescription }
        reply: ServerReplyMessages["player-join-game-reply"]
    }
    "player-leave-game": {
        name: "player-leave-game"
        data: void
        reply: undefined
    }
    "player-change-ready-state": {
        type: "player-change-ready-state"
        data: { id: string; ready: boolean }
        reply: undefined
    }
    "player-start-game": {
        type: "player-start-game"
        data: { id: string }
        reply: undefined
    }
}

export interface ServerReplyMessages {
    "player-join-lobby-reply": ServerReplyMessage<
        "player-join-lobby-reply",
        { id: string }
    >
    "player-host-game-reply": ServerReplyMessage<
        "player-host-game-reply",
        RoomRecord
    >
    "player-list-games-reply": ServerReplyMessage<
        "player-list-games-reply",
        { games: RoomRecord[] }
    >
    "player-join-game-reply": ServerReplyMessage<
        "player-join-game-reply",
        RoomRecord
    >
}

export type ServerReplyData<T extends keyof ServerReplyMessages> =
    ServerReplyMessages[T] extends { success: true }
        ? ServerReplyMessages[T]["data"]
        : undefined

type PrettyServerReplyMessages = Prettify<ServerReplyMessages>

export interface ServerMessages {
    "server-error": {
        name: "server-error"
        data: { error: string }
    }
    "lobby-player-connected": {
        name: "lobby-player-connected"
        data: { id: string; name: string }
    }
    "lobby-player-disconnected": {
        name: "lobby-player-disconnected"
        data: { id: string }
    }
    "lobby-game-created": {
        name: "lobby-game-created"
        data: { id: string }
    }
    "lobby-game-deleted": {
        name: "lobby-game-deleted"
        data: { id: string }
    }
    "room-player-connected": {
        name: "room-player-connected"
        data: PlayerRecord
    }
    "room-player-disconnected": {
        name: "room-player-disconnected"
        data: { id: string }
    }
    "room-player-ready-change": {
        name: "room-player-ready-change"
        data: { id: string; ready: boolean }
    }
    "room-start-game": {
        name: "room-start-game"
        data: { id: string }
    }
}

type PrettyServerMessages = Prettify<ServerMessages>

export type ServerMessageHandler = {
    [K in keyof ServerMessages]: (data: ServerMessages[K]["data"]) => void
}

type PrettyServerMessageHandler = Prettify<ServerMessageHandler>
