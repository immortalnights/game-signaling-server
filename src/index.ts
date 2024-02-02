import { setTimeout } from "node:timers/promises"
import { randomUUID } from "node:crypto"
import { TicTakToe } from "./TicTacToe.js"
import {
    joinGameMenu,
    mainMenu,
    multiplayerMenu,
    multiplayerServerAddress,
    takeTurn,
} from "./cli.js"
import { PeerConnection } from "./PeerConnection.js"
import { Game, GameState } from "./Game.js"
import { Player } from "./Player.js"
import { RemotePlayer } from "./RemotePlayer.js"
import { AI } from "./AI.js"
import { Lobby } from "./client/Lobby.js"
import { throwError } from "./signalingserver/utils.js"
import { LocalPlayer } from "./LocalPlayer.js"
import { RoomState } from "./signalingserver/types.js"
import { program } from "commander"

enum State {
    MainMenu,
    ServerConnectionMenu,
    ConnectingToLobby,
    MultiplayerMenu,
    HostMultiplayerGame,
    JoinGameMenu,
    LobbyRoom,
    // Game world initialization and player connection checks
    CreateGame,
    LocalPlayerTurn,
    RemotePlayerTurn,
    GameOver,
}

let state: State = State.MainMenu
let player = new LocalPlayer(`Player ${Math.floor(Math.random() * 10)}`)
let lobby: Lobby | undefined
let game: TicTakToe | undefined

program
    .option("--serverAddress <addr>", "Server IP or Hostname", "127.0.0.1:9001")
    .option("--host", "Host a game (default options)")
    .option("--join", "Join a game by name")
    .option("--name <arg>", "Name of game room to host or join", "Quick-Game")
    .parse(process.argv)

const options = program.opts()

const reset = async () => {
    game = undefined

    // reset player
    if (player) {
        player.close()
    }

    if (lobby) {
        lobby?.disconnect()
        lobby = undefined
    }

    await setTimeout(2000)
    state = State.MainMenu
}

if (options.join) {
    try {
        lobby = new Lobby(options.serverAddress)
        console.log("Connecting to lobby...")
        await lobby.connect(player)
        const rooms = (await lobby.list()) ?? []
        const autoJoinRoom = rooms.find((room) => room.name === options.name)
        if (autoJoinRoom) {
            console.log(`Joining game room '${options.name}'...`)
            await lobby.join(autoJoinRoom)
            state = State.LobbyRoom
        } else {
            console.error(`Failed to find game '${options.name}'`)
            await setTimeout(2000)
        }
    } catch (err) {
        console.error("Failed to join game")
        await setTimeout(2000)
    }
} else if (options.host) {
    try {
        lobby = new Lobby(options.serverAddress)
        console.log("Connecting to lobby...")
        await lobby.connect(player)
        await lobby.host(options.name, {
            minPlayers: 2,
            maxPlayers: 2,
        })
        state = State.LobbyRoom
    } catch (err) {
        console.error("Failed to host game")
        await setTimeout(2000)
    }
}

let play = true
while (play) {
    switch (state) {
        case State.MainMenu: {
            console.clear()
            const choice = await mainMenu()

            switch (choice) {
                case "single-player": {
                    console.log("Start a single player game")
                    game = new TicTakToe(
                        player.id,
                        [player, new AI()],
                        "LocalGame",
                        {
                            minPlayers: 2,
                            maxPlayers: 2,
                        },
                    )
                    state = State.LocalPlayerTurn
                    break
                }
                case "multiplayer": {
                    const serverAddress = await multiplayerServerAddress()
                    console.log(`Connection to ${serverAddress}...`)
                    lobby = new Lobby(serverAddress)
                    state = State.ConnectingToLobby
                    break
                }
                case "quit": {
                    play = false
                    break
                }
            }
            break
        }
        case State.ConnectingToLobby: {
            console.log("Connecting to lobby...")
            await lobby?.connect(player)
            state = State.MultiplayerMenu
            break
        }
        case State.MultiplayerMenu: {
            const choice = await multiplayerMenu()
            switch (choice) {
                case "host-game": {
                    await lobby?.host("MyGame", {
                        minPlayers: 2,
                        maxPlayers: 2,
                    })
                    state = State.LobbyRoom
                    break
                }
                case "join-game": {
                    const rooms = (await lobby?.list()) ?? []
                    console.log("rooms", rooms)
                    const choice = await joinGameMenu(rooms)
                    const roomToJoin = rooms.find((room) => room.id === choice)
                    if (roomToJoin) {
                        await lobby?.join(roomToJoin)
                        state = State.LobbyRoom
                    } else {
                        await reset()
                    }

                    break
                }
                case "cancel": {
                    await reset()
                    break
                }
            }
            break
        }
        case State.LobbyRoom: {
            if (!lobby) {
                throw Error("Missing lobby for state")
            } else if (!lobby.room) {
                throw Error("Missing room for state")
            }

            const room = lobby.room

            let duration = 0
            let frame = 250
            // Wait for the room to change state, or timeout after 30 seconds
            while (
                (room.state === RoomState.Open ||
                    room.state === RoomState.Closed) &&
                duration < 5000
            ) {
                await setTimeout(frame)
                console.clear()

                if (room.host) {
                    if (room.players.length === 2) {
                        if (room.state === RoomState.Open) {
                            console.log("Starting game...")
                            // Start the game
                            room.startGame()
                        } else {
                            // shouldn't get here...
                            console.log("Stick in room?...")
                        }
                    } else {
                        console.log("Waiting for opponent...")
                    }
                } else {
                    console.log("Waiting for game to start...")
                }

                duration += frame
            }

            if (room.state === RoomState.Complete) {
                state = State.CreateGame
            } else {
                console.error("Failed to start or join game")
                await reset()
            }
            break
        }
        case State.CreateGame: {
            if (!lobby || !lobby.room) {
                throw Error("Invalid lobby or room")
            }

            game = new TicTakToe(
                player.id,
                lobby.room.players,
                lobby.room.name,
                lobby.room.options,
            )
            state = State.LocalPlayerTurn

            await game.waitForReady()
            break
        }
        case State.LocalPlayerTurn: {
            if (!game) {
                throw new Error("Invalid game for state")
            }

            try {
                game.render()
                const move = await takeTurn(game.availableMoves)
                await game.takeTurn(player, move)

                if (game.finished()) {
                    state = State.GameOver
                } else {
                    state = State.RemotePlayerTurn
                }
            } catch (error) {
                console.log("Player has quit game", error)
                await reset()
            }
            break
        }
        case State.RemotePlayerTurn: {
            console.clear()
            console.log("Waiting for opponent...")
            await setTimeout(250)
            break
        }
        case State.GameOver: {
            console.clear()
            game?.render()
            const winner = game?.calculateWinner()
            console.log(`${winner} Wins!`)
            await reset()
            break
        }
    }
}
