export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export declare const deleteItemFromArray: <T>(array: T[], item: T) => T[] | undefined;
export declare function throwError(...args: ConstructorParameters<typeof Error>): never;
