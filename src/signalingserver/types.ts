export interface GameRecord {
    id: string
    name: string
    maxPlayers: number
    players: string[]
    [key: string]: unknown
}

export interface GameOptions {
    name: string
    maxPlayers: number
    [key: string]: unknown
}
