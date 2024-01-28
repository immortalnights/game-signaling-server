export const mainMenuChoices = ["single-player", "multiplayer", "quit"] as const
export type MainMenuChoices = (typeof mainMenuChoices)[number]

export const multiplayerMenuChoices = [
    "host-game",
    "join-game",
    "cancel",
] as const
export type MultiplayerMenuChoices = (typeof multiplayerMenuChoices)[number]
