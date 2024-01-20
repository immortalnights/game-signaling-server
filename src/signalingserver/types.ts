export interface MessageInterface {
    "host-game": Object
    "list-games": Object
    "game-list": Object
    "joined-game": Object
}

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

export interface Message {
    action: keyof MessageInterface
    data: Object
}

export interface MessageResponse {
    action: keyof MessageInterface
    data: Object
}
