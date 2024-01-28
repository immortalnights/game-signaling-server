import { PeerConnection } from "./PeerConnection.js"

export class Player {
    id: string
    name: string
    peerConnection: PeerConnection

    constructor(name?: string) {
        this.id = "LocalPlayer"
        this.name = name ?? `Player ${Math.floor(Math.random() * 10)}`
        this.peerConnection = new PeerConnection()
    }

    close() {
        this.peerConnection.close()
    }
}
