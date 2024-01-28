import { RTCSessionDescription } from "werift"

export interface PlayerRecord {
    id: string
    name: string
    ready: boolean
    sessionDescription?: RTCSessionDescription | undefined
    host: boolean
}

export interface GameRecord {
    id: string
    name: string
    players: PlayerRecord[]
    options: GameOptions
}

export interface GameOptions {
    maxPlayers: number
    minPlayers?: number
    [key: string]: unknown
}
