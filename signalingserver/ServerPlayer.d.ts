import { WebSocket } from "uWebSockets.js";
import type { PlayerRecord } from "./types.js";
import type { UserData } from "./app.js";
export interface ServerPlayer extends PlayerRecord {
    ws: WebSocket<UserData>;
    room?: string;
    game?: string;
    autoReady: boolean;
}
