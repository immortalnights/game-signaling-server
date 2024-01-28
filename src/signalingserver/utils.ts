export type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

export function throwError(
    ...args: ConstructorParameters<typeof Error>
): never {
    throw new Error(...args)
}
