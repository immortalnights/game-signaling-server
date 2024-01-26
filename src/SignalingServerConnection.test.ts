import { SignalingServerConnection } from "./SignalingServerConnection.js"

let games
let hosted

const ss = new SignalingServerConnection("127.0.0.1:9001")
await ss.connect("TestA")
games = await ss.list()
console.log("Games", games)
hosted = await ss.host(
    "MyGame",
    { sdp: "", type: "answer" },
    {
        maxPlayers: 2,
    },
)
console.log("Hosted", hosted)
games = await ss.list()
console.log("Post host games", games)
await ss.delete(hosted.id)
games = await ss.list()
console.log("Post delete games:", games)

setTimeout(() => ss.disconnect(), 5000)
