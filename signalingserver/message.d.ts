import type { GameOptions, RoomRecord, PlayerRecord, RTCSessionDescriptionLike, RTCIceCandidateLike } from "./types.js";
export interface ClientMessage {
    name: string;
    body: unknown;
    reply: ServerMessages;
}
export type ServerMessage = {
    name: string;
    body: unknown;
};
export type ServerReplyMessage<Name, Body> = {
    name: Name;
} & ({
    success: true;
    body: Body;
} | {
    success: false;
    error: string;
});
export type GeneralServerReplyMessage = ServerReplyMessage<keyof ServerReplyMessages, unknown> | undefined;
/**
 * reply: message to wait for as verification of the request
 */
export interface ClientMessages {
    "player-join-lobby": {
        name: "player-join-lobby";
        body: {
            name: string;
        };
        reply: ServerReplyMessages["player-join-lobby-reply"];
    };
    "player-leave-lobby": {
        name: "player-leave-lobby";
        body: void;
        reply: undefined;
    };
    "player-host-game": {
        name: "player-host-game";
        body: {
            name: string;
            options?: GameOptions;
            autoReady?: boolean;
        };
        reply: ServerReplyMessages["player-host-game-reply"];
    };
    "player-list-players": {
        name: "player-list-players";
        body: void;
        reply: ServerReplyMessages["player-list-players-reply"];
    };
    "player-list-rooms": {
        name: "player-list-rooms";
        body: void;
        reply: ServerReplyMessages["player-list-rooms-reply"];
    };
    "player-join-room": {
        name: "player-join-room";
        body: {
            room: string;
            autoReady?: boolean;
        };
        reply: ServerReplyMessages["player-join-room-reply"];
    };
    "player-leave-room": {
        name: "player-leave-room";
        body: void;
        reply: undefined;
    };
    "player-connect-to-peer": {
        type: "player-connect-to-peer";
        body: {
            peer: string;
            offer: RTCSessionDescriptionLike;
            candidates: RTCIceCandidateLike[];
        };
        reply: void;
    };
    "player-connect-to-host": {
        type: "player-connect-to-host";
        body: {
            answer: RTCSessionDescriptionLike;
        };
        reply: void;
    };
    "player-exchange-ice-candidates": {
        type: "player-exchange-ice-candidates";
        body: {
            peer: string;
            candidates: RTCIceCandidateLike;
        };
        reply: void;
    };
    "player-change-ready-state": {
        type: "player-change-ready-state";
        body: {
            ready: boolean;
        };
        reply: undefined;
    };
    "player-start-game": {
        type: "player-start-game";
        body: {
            options: object;
        };
        reply: undefined;
    };
}
export interface ServerReplyMessages {
    "player-join-lobby-reply": ServerReplyMessage<"player-join-lobby-reply", {
        id: string;
        name: string;
    }>;
    "player-host-game-reply": ServerReplyMessage<"player-host-game-reply", RoomRecord>;
    "player-list-rooms-reply": ServerReplyMessage<"player-list-rooms-reply", {
        rooms: RoomRecord[];
    }>;
    "player-list-players-reply": ServerReplyMessage<"player-list-players-reply", {
        players: PlayerRecord[];
    }>;
    "player-join-room-reply": ServerReplyMessage<"player-join-room-reply", RoomRecord>;
}
export type ServerReplyData<T extends keyof ServerReplyMessages> = ServerReplyMessages[T] extends {
    success: true;
} ? ServerReplyMessages[T]["body"] : undefined;
export interface ServerMessages {
    "server-error": {
        name: "server-error";
        body: {
            error: string;
        };
    };
    "lobby-player-connected": {
        name: "lobby-player-connected";
        body: Pick<PlayerRecord, "id" | "name">;
    };
    "lobby-player-disconnected": {
        name: "lobby-player-disconnected";
        body: Pick<PlayerRecord, "id" | "name">;
    };
    "lobby-room-created": {
        name: "lobby-room-created";
        body: RoomRecord;
    };
    "lobby-room-deleted": {
        name: "lobby-room-deleted";
        body: Pick<RoomRecord, "id">;
    };
    "room-player-connected": {
        name: "room-player-connected";
        body: PlayerRecord;
    };
    "room-player-disconnected": {
        name: "room-player-disconnected";
        body: Pick<PlayerRecord, "id" | "name">;
    };
    "room-player-ready-change": {
        name: "room-player-ready-change";
        body: Pick<PlayerRecord, "id" | "ready">;
    };
    "room-player-rtc-host-offer": {
        name: "room-player-rtc-host-offer";
        body: Pick<PlayerRecord, "id"> & {
            sessionDescription: RTCSessionDescriptionLike;
            candidates: RTCIceCandidateLike[];
        };
    };
    "room-player-rtc-answer": {
        name: "room-player-rtc-answer";
        body: Pick<PlayerRecord, "id"> & {
            sessionDescription: RTCSessionDescriptionLike;
        };
    };
    "room-start-game": {
        name: "room-start-game";
        body: {
            room: string;
            game: string;
        };
    };
    "room-closed": {
        name: "room-closed";
        body: Pick<RoomRecord, "id">;
    };
}
export type ServerMessageHandler = {
    [K in keyof ServerMessages]: (data: ServerMessages[K]["body"]) => void;
};
