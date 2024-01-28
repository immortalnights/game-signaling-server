import select, { Separator } from "@inquirer/select"
import input from "@inquirer/input"
import {
    mainMenuChoices,
    multiplayerMenuChoices,
    type MainMenuChoices,
    MultiplayerMenuChoices,
} from "./types.js"
import { GameRecord } from "./signalingserver/types.js"
import { throwError } from "./signalingserver/utils.js"

export const mainMenu = async (): Promise<MainMenuChoices> => {
    const choice = await select({
        message: "Tic-tac-toe: Main Menu",
        choices: [
            {
                name: "Single Player",
                value: "single-player",
                description: "Play a single player game",
            },
            {
                name: "Multiplayer",
                value: "multiplayer",
                description: "Host or join a multiplayer game",
            },
            new Separator(),
            {
                name: "Quit",
                value: "quit",
                description: "Quit",
            },
        ],
    })

    if (!mainMenuChoices.includes(choice as MainMenuChoices)) {
        throw Error("Invalid choice from menu")
    }

    return Promise.resolve(choice as MainMenuChoices)
}

export const multiplayerServerAddress = async () => {
    return input({
        message: "Enter Server address",
        default: "127.0.0.1:9001",
    })
}

export const multiplayerMenu = async () => {
    const choice = await select({
        message: "Tic-tac-toe: Multiplayer",
        choices: [
            {
                name: "Host Game",
                value: "host-game",
                description: "Host a multiplayer game",
            },
            {
                name: "Join Game",
                value: "join-game",
                description: "Join a multiplayer game",
            },
            new Separator(),
            {
                name: "Cancel",
                value: "cancel",
                description: "Cancel",
            },
        ],
    })

    if (!multiplayerMenuChoices.includes(choice as MultiplayerMenuChoices)) {
        throw Error("Invalid choice from menu")
    }

    return Promise.resolve(choice as MultiplayerMenuChoices)
}

export const joinGameMenu = async (games: GameRecord[]) => {
    const answer = await select({
        message: "Tic-tac-toe: Join Game",
        choices: [
            ...games.map((game) => {
                const host =
                    game.players.find((player) => player.host) ??
                    throwError("Failed to find host")

                return {
                    name: `${game.name} by ${host?.name ?? "unknown"}`,
                    value: game.id,
                    description: "Join game",
                }
            }),
            new Separator(),
            {
                name: "Cancel",
                value: "cancel",
                description: "cancel",
            },
        ],
    })

    return Promise.resolve(answer)
}

export const takeTurn = async (availableMoves: number[]) => {
    let move
    while (move !== "quit" && !availableMoves.includes(Number(move))) {
        console.log(
            `Available moves: ${availableMoves.join(
                ", ",
            )}. To quit, enter 'quit'`,
        )
        move = await input({ message: "Enter space" })
    }

    return move !== "quit" ? Promise.resolve(Number(move)) : Promise.reject()
}

const waitForOpponent = () => {}
