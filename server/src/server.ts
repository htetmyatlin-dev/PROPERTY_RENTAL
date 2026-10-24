import dotenv from "dotenv"
import http from "http"
dotenv.config()

import app from "./app.js"
import { Server } from "socket.io"
import { socketHandler } from "./lib/socket.js"
import { connectRedis } from "./lib/redis.js"

const server = http.createServer(app)

// Socket.io server initialization
const io = new Server(server, {
    cors: { 
        origin: process.env.FRONTEND_URL, 
        credentials: true, 
        methods: ["GET", "POST"] 
    }
})

socketHandler(io);

const PORT = process.env.PORT || 7000;
 
server.listen(PORT, async () => {
    await connectRedis();
    console.log(`Server is running on port ${PORT}`)
})
