import { RoomState } from "./states.js"

export type RTCSessionDescriptionLike = { type: unknown; sdp?: string }
export type RTCIceCandidateLike = {}

export interface PlayerRecord {
    id: string
    name: string
    ready: boolean
    sessionDescription?: RTCSessionDescriptionLike | undefined
    // Host only
    iceCandidates?: RTCIceCandidateLike[]
    host: boolean
}

export interface RoomRecord {
    id: string
    name: string
    state: RoomState
    players: PlayerRecord[]
    options: GameOptions
}

export interface GameOptions {
    maxPlayers: number
    minPlayers?: number
    [key: string]: unknown
}
