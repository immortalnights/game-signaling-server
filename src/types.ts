export const mainMenuChoices = ["single-player", "multiplayer"] as const
export type MainMenuChoices = (typeof mainMenuChoices)[number]

export const multiplayerMenuChoices = ["host-game", "join-game"] as const
export type MultiplayerMenuChoices = (typeof multiplayerMenuChoices)[number]
