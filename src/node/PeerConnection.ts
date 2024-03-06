import {
    RTCPeerConnection,
    RTCDataChannel,
    RTCSessionDescription,
} from "werift"

export interface PeerMessage {
    name: string
    player?: string
    data?: object
}

export type PeerConnectionMessageCallback = (data: PeerMessage) => void

export class PeerConnection {
    pc: RTCPeerConnection
    private dc?: RTCDataChannel
    private onMessage?: PeerConnectionMessageCallback

    constructor() {
        this.pc = new RTCPeerConnection({})
        this.pc.iceConnectionStateChange.subscribe((v) =>
            console.log("pc.iceConnectionStateChange", v),
        )

        this.pc.onDataChannel.subscribe((channel) => {
            console.log("pc.onDataChannel")
            this.subscribeToDataChannel(channel)
        })
    }

    get connected() {
        return (
            this.pc.iceConnectionState === "connected" &&
            this.dc?.readyState === "open"
        )
    }

    subscribe(onMessage: PeerConnectionMessageCallback) {
        this.onMessage = onMessage
    }

    async offer(name: string = "default"): Promise<RTCSessionDescription> {
        const channel = this.pc.createDataChannel(name, {
            protocol: "default",
        })
        this.subscribeToDataChannel(channel)

        const offer = await this.pc.createOffer()
        console.debug("Set local description", offer)
        await this.pc.setLocalDescription(offer)

        return offer
    }

    async response(answer: RTCSessionDescription) {
        console.debug("Set remote description", answer)
        await this.pc.setRemoteDescription(answer)
    }

    async answer(offer: RTCSessionDescription): Promise<RTCSessionDescription> {
        console.debug("Set remote description", offer)
        await this.pc.setRemoteDescription(offer)

        const answer = await this.pc.createAnswer()
        console.debug("Set local description", answer)
        await this.pc.setLocalDescription(answer)

        return answer
    }

    send(data: object | string | Buffer) {
        this.dc?.send(data instanceof Object ? JSON.stringify(data) : data)
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
            const json = JSON.parse(data.toString())
            if ("name" in json) {
                this.onMessage?.(json as PeerMessage)
            }
        })

        this.dc.error.subscribe((err) => console.error)
    }
}
