export const randomString = (len: number = 6) =>
    (Math.random() + 1).toString(36).substring(len)
