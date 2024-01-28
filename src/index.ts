import { setTimeout } from "node:timers/promises"
import { TicTakToe } from "./TicTacToe.js"
import {
    joinGameMenu,
    mainMenu,
    multiplayerMenu,
    multiplayerServerAddress,
    takeTurn,
} from "./cli.js"
import { PeerConnection } from "./PeerConnection.js"
import { Game } from "./Game.js"
import { Player } from "./Player.js"
import { RemotePlayer } from "./RemotePlayer.js"
import { AI } from "./AI.js"
import { Lobby } from "./client/Lobby.js"
import { throwError } from "./signalingserver/utils.js"

enum State {
    MainMenu,
    ServerConnectionMenu,
    ConnectingToLobby,
    MultiplayerMenu,
    HostMultiplayerGame,
    JoinGameMenu,
    WaitingForStart,
    LocalPlayerTurn,
    RemotePlayerTurn,
    GameOver,
}

let state: State = State.MainMenu
// TODO player should be owned by Lobby if multiplayer
let player = new Player()
let lobby: Lobby | undefined
let game: TicTakToe | undefined

const reset = async () => {
    game = undefined

    // reset player
    if (player) {
        player.close()
        player = new Player()
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
                    game = new TicTakToe(player, "LocalGame")
                    game.addPlayer(new AI())
                    state = State.LocalPlayerTurn
                    break
                }
                case "multiplayer": {
                    const serverAddress = await multiplayerServerAddress()
                    console.log(`Connection to ${serverAddress}...`)
                    lobby = new Lobby(serverAddress, player)
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
            // player.id =
            await lobby?.connect(player.id, player.name)
            state = State.MultiplayerMenu
            break
        }
        case State.MultiplayerMenu: {
            const choice = await multiplayerMenu()
            switch (choice) {
                case "host-game": {
                    const sessionDescription =
                        await player.peerConnection.offer()
                    await lobby?.host("MyGame", sessionDescription, {
                        minPlayers: 2,
                        maxPlayers: 2,
                    })
                    state = State.WaitingForStart
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
                        state = State.WaitingForStart
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
        case State.WaitingForStart: {
            // console.log("Waiting for opponent")
            await setTimeout(250)

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
