import type {
    GameOptions,
    RoomRecord,
    PlayerRecord,
    RTCSessionDescriptionLike,
    RTCIceCandidateLike,
} from "./types.js"

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
    "player-leave-lobby": {
        name: "player-leave-lobby"
        data: void
        reply: undefined
    }
    "player-host-game": {
        name: "player-host-game"
        data: {
            name: string
            options?: GameOptions
            sessionDescription: RTCSessionDescriptionLike
            candidates: RTCIceCandidateLike[]
        }
        reply: ServerReplyMessages["player-host-game-reply"]
    }
    "player-list-players": {
        name: "player-list-players"
        data: void
        reply: ServerReplyMessages["player-list-players-reply"]
    }
    "player-list-games": {
        name: "player-list-games"
        data: void
        reply: ServerReplyMessages["player-list-games-reply"]
    }
    // FIXME remove, use leave-game instead
    "player-delete-game": {
        name: "player-delete-game"
        // FIXME id should not be required
        data: { id: string }
        reply: undefined
    }
    "player-join-game": {
        name: "player-join-game"
        // FIXME id should not be required
        data: { id: string; sessionDescription: RTCSessionDescriptionLike }
        reply: ServerReplyMessages["player-join-game-reply"]
    }
    "player-leave-game": {
        name: "player-leave-game"
        data: void
        reply: undefined
    }
    "player-connect-to-peer": {
        type: "player-connect-to-peer"
        data: {
            peer: string
            offer: RTCSessionDescriptionLike
            candidates: RTCIceCandidateLike
        }
        reply: void
    }
    "player-connect-to-host": {
        type: "player-connect-to-host"
        data: { answer: RTCSessionDescriptionLike }
        reply: void
    }
    // not implemented
    "player-exchange-ice-candidates": {
        type: "player-exchange-ice-candidates"
        data: { peer: string; candidates: RTCIceCandidateLike }
        reply: void
    }
    "player-change-ready-state": {
        type: "player-change-ready-state"
        // FIXME id should not be required
        data: { id: string; ready: boolean }
        reply: undefined
    }
    "player-start-game": {
        type: "player-start-game"
        // FIXME id should not be required
        data: { id: string }
        reply: undefined
    }
}

export interface ServerReplyMessages {
    "player-join-lobby-reply": ServerReplyMessage<
        "player-join-lobby-reply",
        { id: string; name: string }
    >
    "player-host-game-reply": ServerReplyMessage<
        "player-host-game-reply",
        RoomRecord
    >
    "player-list-games-reply": ServerReplyMessage<
        "player-list-games-reply",
        { games: RoomRecord[] }
    >
    "player-list-players-reply": ServerReplyMessage<
        "player-list-games-players",
        { players: PlayerRecord[] }
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

export interface ServerMessages {
    "server-error": {
        name: "server-error"
        data: { error: string }
    }
    "lobby-player-connected": {
        name: "lobby-player-connected"
        data: Pick<PlayerRecord, "id" | "name">
    }
    "lobby-player-disconnected": {
        name: "lobby-player-disconnected"
        data: Pick<PlayerRecord, "id">
    }
    "lobby-room-created": {
        name: "lobby-room-created"
        data: RoomRecord
    }
    "lobby-room-deleted": {
        name: "lobby-room-deleted"
        data: Pick<RoomRecord, "id">
    }
    "room-player-connected": {
        name: "room-player-connected"
        data: PlayerRecord
    }
    "room-player-disconnected": {
        name: "room-player-disconnected"
        data: Pick<PlayerRecord, "id">
    }
    "room-player-ready-change": {
        name: "room-player-ready-change"
        data: Pick<PlayerRecord, "id" | "ready">
    }
    "room-player-rtc-host-offer": {
        name: "room-player-rtc-host-offer"
        data: Pick<PlayerRecord, "id" | "sessionDescription" | "candidates">
    }
    "room-player-rtc-answer": {
        name: "room-player-rtc-answer"
        data: Pick<PlayerRecord, "id" | "sessionDescription">
    }
    "room-start-game": {
        name: "room-start-game"
        data: Pick<RoomRecord, "id">
    }
    "room-closed": {
        name: "room-closed"
        data: Pick<RoomRecord, "id">
    }
}

export type ServerMessageHandler = {
    [K in keyof ServerMessages]: (data: ServerMessages[K]["data"]) => void
}
