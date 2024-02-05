import { RTCSessionDescription } from "werift"
import { RoomState } from "./Room.js"

export interface PlayerRecord {
    id: string
    name: string
    ready: boolean
    sessionDescription?: RTCSessionDescription | undefined
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
