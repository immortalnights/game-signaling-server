import { ServerPlayer } from "./ServerPlayer.js"
import { ServerMessages } from "./message.js"

export const broadcast = <T extends keyof ServerMessages>(
    players: ServerPlayer[],
    name: ServerMessages[T]["name"],
    data:
        | ServerMessages[T]["data"]
        | ((target: ServerPlayer) => ServerMessages[T]["data"]),
    exclude: string[] = [],
) => {
    players.forEach((player) => {
        if (!exclude.includes(player.id)) {
            console.debug(`Broadcast ${name} to ${player.id}`)

            const preparedData = data instanceof Function ? data(player) : data
            if (player.ws) {
                player.ws.send(
                    JSON.stringify({
                        name,
                        data: preparedData,
                    }),
                )
            }
        }
    })
}
