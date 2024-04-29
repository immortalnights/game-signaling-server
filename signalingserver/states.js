export var RoomState;
(function (RoomState) {
    // Players can join
    RoomState[RoomState["Open"] = 0] = "Open";
    // Players can leave or change their ready state, but cannot join
    // Applied when the host has started the game
    RoomState[RoomState["Locked"] = 1] = "Locked";
    // All players are ready and the game should begin
    RoomState[RoomState["Complete"] = 2] = "Complete";
    // Room is no longer available
    RoomState[RoomState["Closed"] = 3] = "Closed";
})(RoomState || (RoomState = {}));
