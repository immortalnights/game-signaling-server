import { RTCSessionDescription } from "werift"

export enum RoomState {
    // Players can join
    Open,
    // Players can leave or change their ready state, but cannot join
    // Applied when the host has started the game
    Locked,
    // All players are ready and the game should begin
    Complete,
    // Room is no longer available
    Closed,
}

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
