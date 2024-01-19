import {
    RTCPeerConnection,
    RTCDataChannel,
    RTCSessionDescription,
} from "werift"

export class PeerConnection {
    pc: RTCPeerConnection
    private dc?: RTCDataChannel

    constructor() {
        this.pc = new RTCPeerConnection({})
        this.pc.iceConnectionStateChange.subscribe((v) =>
            console.log("pc.iceConnectionStateChange", v),
        )

        this.pc.onDataChannel.subscribe((channel) => {
            this.subscribeToDataChannel(channel)
        })
    }

    async offer(name: string = "default"): Promise<RTCSessionDescription> {
        const channel = this.pc.createDataChannel(name, {
            protocol: "default",
        })
        this.subscribeToDataChannel(channel)

        const offer = await this.pc.createOffer()
        await this.pc.setLocalDescription(offer)

        return offer
    }

    async response(answer: RTCSessionDescription) {
        await this.pc.setRemoteDescription(answer)
    }

    async answer(offer: RTCSessionDescription): Promise<RTCSessionDescription> {
        await this.pc.setRemoteDescription(offer)

        const answer = await this.pc.createAnswer()
        await this.pc.setLocalDescription(answer)

        return answer
    }

    send(data: string | Buffer) {
        this.dc?.send(data)
    }

    close() {
        this.pc.close()
    }

    private subscribeToDataChannel(channel: RTCDataChannel) {
        this.dc = channel

        this.dc.stateChanged.subscribe((v) => {
            console.log("dc.stateChanged", v)
        })

        this.dc.message.subscribe((data) => {
            console.log("dc.message", data.toString())
        })

        this.dc.error.subscribe((err) => console.error)
    }
}
