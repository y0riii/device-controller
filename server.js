const express = require("express")
const app = express()
const http = require("http");
const server = http.createServer(app);
const socket = require("socket.io");
const fs = require("fs")
const robot = require("@jitsi/robotjs");
const cors = require("cors")
var ip;
let ipAddress = "192.168.1.11"; // Change that one to your ip address.
const io = require('socket.io')(server, {
    cors: {
      origin: '*',
    }
  });

const allowedOrigins = ['http://localhost:4000', `http://${ipAddress}:4000`];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions));
const size = robot.getScreenSize()
robot.setMouseDelay(0)

const { networkInterfaces } = require('os');

const nets = networkInterfaces();
const results = Object.create(null); // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
                results[name] = [];
            }
            ip = net.address;
        }
    }
}

console.log(ip)

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html")
})

io.on("connection", (socket) => {
    socket.on("request", num => {
        socket.broadcast.emit("response", num)
    })

    socket.on("write", async (num) => {
        try {
            if (num == "lc") {
                robot.mouseClick("left")
            } else {
                robot.mouseToggle("down", num)
            }
        } catch (err) { }
    })

    socket.on("mouse-move-req", ({ moveX, moveY }) => {
        socket.broadcast.emit("mouse-move-res", { moveX: moveX, moveY: moveY })
    })

    socket.on("mouse-move-write", ({ moveX, moveY }) => {
        var pos = robot.getMousePos()
        var lastPosX = moveX + pos.x
        var lastPosY = moveY + pos.y
        if (lastPosX >= size.width - 1) {
            lastPosX = size.width - 1
        } else if (lastPosY >= size.height - 1) {
            lastPosY = size.height - 1
        } else if (lastPosX <= 0) {
            lastPosX = 0
        } else if (lastPosY <= 0) {
            lastPosY = 0
        }
        if (pos.x == 0 && pos.y == 0) {
            robot.moveMouse(1, 1)
        } else if (pos.x == 0 && pos.y == size.height - 1) {
            robot.moveMouse(1, pos[1] - 1)
        } else if (pos.x == size.width - 1 && pos.y == 0) {
            robot.moveMouse(pos.x - 2, 1)
        } else if (pos.x == size.height - 1 && pos.y == size.height - 1) {
            robot.moveMouse(pos.x - 1, pos.y - 1)
        }
        robot.moveMouse(lastPosX, lastPosY)
    })

    socket.on("request-stop", num => {
        socket.broadcast.emit("response-stop", num)
    })

    socket.on("stop-write", async (num) => {
        try {
            robot.mouseToggle("up", num)
        } catch (err) { }
    })

    socket.on("join-room", (room, id) => {
        socket.join(room)
        io.to(room).emit('user-connected', id)

        socket.on('disconnect', (room) => {
            socket.leave(room)
            io.to(room).emit('user-disconnected', id)
        })
    })

    socket.on("set-aspect", () => {
        socket.broadcast.emit("get-aspect", { width: size.width, height: size.height })
    })

    socket.on("insta-click", ({ x, y }) => {
        socket.broadcast.emit("try-click", { x: x, y: y })
    })
    socket.on("insta-click-res", ({ x, y }) => {
        robot.moveMouse(x, y)
        robot.mouseClick("left")
    })
})

server.listen(4000)