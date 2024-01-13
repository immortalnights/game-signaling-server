import select, { Separator } from "@inquirer/select"
import input from "@inquirer/input"

const startGame = async (): Promise<string | undefined> => {
    return undefined
}

const hostGame = async (): Promise<string | undefined> => {
    const address = await input({
        message: "Enter Server address",
        default: "127.0.0.1:9001",
    })

    return "abc"
}

const findGame = async (): Promise<string | undefined> => {
    const address = await input({
        message: "Enter Server address",
        default: "127.0.0.1:9001",
    })

    // fetch games
    console.log("Loading games...")

    let game

    const answer = await select({
        message: "Tic-tac-toe: Main Menu",
        choices: [
            // TODO list games
            new Separator(),
            {
                name: "Back",
                value: "back",
                description: "Back",
            },
        ],
    })

    switch (answer) {
        case "back": {
            break
        }
    }

    return game
}

const joinGame = async (game: string) => {}
const playGame = async (game: string) => {}

const mainMenu = async () => {
    const answer = await select({
        message: "Tic-tac-toe: Main Menu",
        choices: [
            {
                name: "Single Player",
                value: "single-player",
                description: "Play a single player game",
            },
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
                name: "Quit",
                value: "quit",
                description: "Quit",
            },
        ],
    })

    switch (answer) {
        case "single-player": {
            const game = await startGame()
            if (game) {
                await joinGame(game)
                await playGame(game)
            }
            break
        }
        case "host-game": {
            const game = await hostGame()
            if (game) {
                await playGame(game)
            }
            break
        }
        case "join-game": {
            const game = await findGame()
            if (game) {
                await joinGame(game)
                await playGame(game)
            }
            break
        }
        case "quit": {
            process.exit(0)
        }
    }
}

const main = async () => {
    while (1) {
        await mainMenu()
    }
}

main()
