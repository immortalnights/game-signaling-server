export type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

export const deleteItemFromArray = <T>(
    array: T[],
    item: T,
): T[] | undefined => {
    let deleted
    const index = array.indexOf(item)
    if (index === -1) {
        console.error("Failed to find item in array")
    } else {
        deleted = array.splice(index, 1)
    }

    return deleted
}

export function throwError(
    ...args: ConstructorParameters<typeof Error>
): never {
    throw new Error(...args)
}
