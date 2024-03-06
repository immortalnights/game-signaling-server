import {
    RTCPeerConnection,
    RTCDataChannel,
    RTCSessionDescription,
    RTCIceCandidate,
} from "werift"
import { waitFor } from "./utilities.js"

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

    async offer(name: string = "default"): Promise<{
        offer: RTCSessionDescription
        iceCandidates: RTCIceCandidate[]
    }> {
        const channel = this.pc.createDataChannel(name, {
            protocol: "default",
        })
        this.subscribeToDataChannel(channel)

        const offer = await this.pc.createOffer()
        console.debug("Set local description", offer)
        await this.pc.setLocalDescription(offer)

        let iceCandidates: RTCIceCandidate[] = []
        this.pc.addEventListener("icecandidate", (event) => {
            if (event.candidate) {
                iceCandidates.push(event.candidate)
            }
        })

        await waitFor(() => this.pc.iceGatheringState === "complete")

        return { offer, iceCandidates }
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

    async setIceCandidates(iceCandidates: RTCIceCandidate[]) {
        console.debug(`Setting ICE candidates ${iceCandidates.length}`)
        return Promise.allSettled(
            iceCandidates.map((candidate) =>
                this.pc.addIceCandidate(candidate),
            ),
        )
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
