import { PeerConnection } from "./PeerConnection.js"
import { Player } from "./Player.js"

export class LocalPlayer extends Player {
    peerConnection: PeerConnection

    constructor(name: string) {
        super(undefined, name)
        this.peerConnection = new PeerConnection()
    }

    close() {
        this.peerConnection.close()
        this.peerConnection = new PeerConnection()
    }
}
