import { RTCSessionDescription } from "werift"

export interface PlayerRecord {
    name: string
    sessionDescription: RTCSessionDescription | undefined
    host: boolean
}

export interface GameOptions {
    maxPlayers: number
    [key: string]: unknown
}

export interface GameRecord {
    id: string
    name: string
    players: PlayerRecord[]
    options: GameOptions
}

export interface GameDescription {
    name: string
    sessionDescription: RTCSessionDescription
    options: GameOptions
}

export interface JoinGameData {
    id: string
    sessionDescription: RTCSessionDescription
}

export interface Message<T> {
    action: keyof ClientMessages
    data: T
}

export interface SuccessResponse<T> {
    success: true
    action: keyof ServerResponseMessages | keyof ServerMessages
    data?: T
}

export interface ErrorResponse {
    success: false
    action: keyof ServerResponseMessages | keyof ServerMessages
    error?: string
}

export type Response<T> = SuccessResponse<T> | ErrorResponse

export interface MessagesX {
    "register-player": {
        data: unknown
        response: "register-player-response"
        responseData: unknown
    }
    "host-game": {
        data: GameOptions
        response: "host-game-response"
        responseData: GameRecord
    }
    "delete-game": {
        data: string
        response: "delete-game-response"
        responseData: unknown
    }
    "list-games": {
        data: void
        response: "list-games-response"
        responseData: GameRecord[]
    }
    "join-game": {
        data: {
            id: string
            sessionDescription: RTCSessionDescription
        }
        response: "join-game-response"
        responseData: GameRecord
    }
}

export interface ClientMessages {
    "register-player": Object
    "host-game": GameOptions
    "delete-game": { id: string }
    "list-games": void
    "join-game": JoinGameData
}

export interface ServerResponseMessages {
    "register-player-response": Object
    "host-game-response": GameRecord
    "delete-game-response": void
    "list-games-response": GameRecord[]
    "join-game-response": GameRecord
}

export interface ServerMessages {
    "player-joined": PlayerRecord
}
