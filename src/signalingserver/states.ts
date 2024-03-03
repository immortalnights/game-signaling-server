export enum RoomState {
    // Players can join
    Open,
    // Players can leave or change their ready state, but cannot join
    // Applied when the host has started the game
    Locked,
    // All players are ready and the game should begin
    Complete,
    // Room is no longer available
    Closed,
}
