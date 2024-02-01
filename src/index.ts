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
                        const host =
                            roomToJoin.players.find((player) => player.host) ??
                            throwError("Failed to find host")

                        if (!host.sessionDescription) {
                            throw Error(
                                "Room host does not have peer connection",
                            )
                        }

                        const answer = await player.peerConnection.answer(
                            host.sessionDescription,
                        )
                        await lobby?.join(roomToJoin, answer)
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
                console.clear()

                if (room.host) {
                    if (room.players.length === 2) {
                        // Start the game
                        console.log("START GAME HERE!")
                        await setTimeout(frame)
                    } else {
                        console.log("Waiting for opponent...")
                        await setTimeout(frame)
                    }
                } else {
                    console.log("Waiting for game to start...")
                    await setTimeout(frame)
                }

                duration += frame
            }

            if (room.state === RoomState.Complete) {
                state = State.CreateGame
            } else {
                console.error("Failed to start or join game")
                await reset()
            }

            //     if (room.players.length === 2) {
            //         if (room.host) {
            //             console.log("Game will start in ten seconds")
            //             await setTimeout(10000)
            //             room.startGame()
            //         } else {
            //             console.log("Waiting for game to start")
            //             await setTimeout(250)
            //             cont = game.state === GameState.Playing
            //         }
            //     } else {
            //         console.log("Waiting for opponent")
            //         await setTimeout(250)
            //     }
            // }

            // if (room.state === GameState.Playing) {
            //     if (game.host.id === player.id) {
            //         state = State.LocalPlayerTurn
            //     } else {
            //         state = State.RemotePlayerTurn
            //     }
            // }

            // try {
            //     await player.waitForOpponent()
            // } catch (error) {
            //     console.error("Failed to find an opponent")
            // }
            // if (!game) {
            //     throw new Error("Invalid game for state")
            // }

            // if (!opponent) {
            //     throw new Error("Invalid opponent for game")
            // }

            // let move
            // let token
            // if (opponent instanceof RemotePlayer) {
            //     token = player.host ? "O" : "X"
            //     move = await opponent.wait()
            // } else {
            //     token = "X"
            //     move = opponent.randomNextMove(game)
            //     console.log(`AI move ${move}`)
            // }

            // game.playerMove(token, move)

            // if (game.finished()) {
            //     player.state = State.GameOver
            // } else {
            //     player.state = State.WaitingForTurn
            // }
            break
        }
        case State.CreateGame: {
            if (!lobby || !lobby.room) {
                throw Error("Invalid lobby or room")
            }

            game = new TicTakToe(
                lobby.room.players,
                lobby.room.name,
                lobby.room.options,
            )

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
