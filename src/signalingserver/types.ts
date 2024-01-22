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

export interface Message<T> {
    action: keyof ClientMessages
    data: T
}

export interface ErrorResponse {
    msg: string
}

export interface ClientMessages {
    "register-player": Message<Object>
    "host-game": Message<GameOptions>
    "delete-game": Message<string>
    "list-games": Message<void>
    "join-game": Message<{
        id: string
        sessionDescription: RTCSessionDescription
    }>
}

export interface ServerResponseMessages {
    "register-player-response": Message<Object | ErrorResponse>
    "host-game-response": Message<GameRecord | ErrorResponse>
    "delete-game-response": Message<void | ErrorResponse>
    "list-games-response": Message<GameRecord[]>
    "join-game-response": Message<GameRecord | ErrorResponse>
}

export interface ServerMessages {
    "player-joined": Message<PlayerRecord>
}
