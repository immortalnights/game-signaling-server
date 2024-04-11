import { ServerPlayer } from "./ServerPlayer.js"
import { ServerMessages } from "./message.js"

export const sendTo = <T extends keyof ServerMessages>(
    player: ServerPlayer,
    name: ServerMessages[T]["name"],
    data:
        | ServerMessages[T]["body"]
        | ((target: ServerPlayer) => ServerMessages[T]["body"]),
) => {
    const body = data instanceof Function ? data(player) : data
    try {
        player.ws.send(
            JSON.stringify({
                name,
                body,
            }),
        )
    } catch (err) {
        console.error(`Failed to send message to ${player.id}:`, err)
    }
}

export const broadcast = <T extends keyof ServerMessages>(
    players: ServerPlayer[],
    name: ServerMessages[T]["name"],
    body: ServerMessages[T]["body"],
    exclude: string[] = [],
) => {
    players.forEach((player) => {
        if (!exclude.includes(player.id)) {
            console.debug(`Broadcast ${name} to ${player.id}`)

            try {
                player.ws.send(
                    JSON.stringify({
                        name,
                        body,
                    }),
                )
            } catch (err) {
                console.error(`Failed to send message to ${player.id}:`, err)
            }
        }
    })
}
