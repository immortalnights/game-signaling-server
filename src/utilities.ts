import { setTimeout } from "node:timers/promises"

export const randomString = (len: number = 6) =>
    (Math.random() + 1).toString(36).substring(len)

/**
 *
 * @param condition
 * @param timeout
 * @returns
 */
export const waitFor = async (
    condition: () => boolean,
    timeout: number = 10000,
) => {
    const tick = 250
    let duration = 0
    while (!condition() && duration < timeout) {
        await setTimeout(tick)
        duration += tick
    }

    return condition()
}
