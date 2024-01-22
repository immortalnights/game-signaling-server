// Define client messages
interface ClientMessage {
    type: string
    data: any
}

// Define server responses
interface ServerResponse {
    success: boolean
    data?: any
    error?: string
}

// Define a generic message handler map
type MessageHandlerMap<T> = {
    [K in keyof T]: (data: T[K]["data"]) => ServerResponse
}

// Define specific client messages and server responses
interface SpecificClientMessages {
    GREET: {
        type: "GREET"
        data: { name: string }
    }
    ADD: {
        type: "ADD"
        data: { num1: number; num2: number }
    }
}

interface SpecificServerResponses {
    GREET: {
        success: true
        data: { message: string }
    }
    ADD: {
        success: true
        data: { result: number }
    }
}

// Create message handler maps
const clientMessageHandlerMap: MessageHandlerMap<SpecificClientMessages> = {
    GREET: (data) => ({
        success: true,
        data: { message: `Hello, ${data.name}!` },
    }),
    ADD: (data) => ({
        success: true,
        data: { result: data.num1 + data.num2 },
    }),
}

const serverMessageHandlerMap: MessageHandlerMap<SpecificServerResponses> = {
    GREET: (data) => ({
        success: true,
        data: { message: `Server received greeting: ${data.message}` },
    }),
    ADD: (data) => ({
        success: true,
        data: { result: data.result },
    }),
}

// Example usage
const clientMessage: SpecificClientMessages["GREET"] = {
    type: "GREET",
    data: { name: "John" },
}

const serverResponse = clientMessageHandlerMap[clientMessage.type](
    clientMessage.data,
)
console.log("Server Response:", serverResponse)

const serverMessage: SpecificServerResponses["GREET"] = {
    success: true,
    data: { message: "Hello from the server!" },
}

const clientResponse = serverMessageHandlerMap[serverMessage.type](
    serverMessage.data,
)
console.log("Client Response:", clientResponse)
