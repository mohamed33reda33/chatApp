const express = require('express');
const path = require('path');
const app = express();
const session = require('express-session');
const flash = require('express-flash');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const https = require('https');
const cors = require('cors');

const fs = require('fs');

const sslServer = https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert')
}, app);
app.use(cors());

app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

const socketIo = require('socket.io');
const io = socketIo(sslServer);

const dotenv = require("dotenv");
dotenv.config({ path: "config.env" });
const morgan = require("morgan");
const DBConnection = require("./config/database");
DBConnection();


if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
    console.log(`mode: ${process.env.NODE_ENV}`);
}

app.use(express.json());

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
}));

app.use(flash());

app.use(express.static(path.join(__dirname, 'public')));


app.use('/views', express.static(path.join(__dirname, 'views')));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res, next) => {
    res.render("home");
});

const authRoutes = require("./routes/authRoutes");
app.use("/auth", authRoutes);

const friendsRoutes = require("./routes/friendsRoutes");
app.use("/friends", friendsRoutes);

const chatRoutes = require("./routes/chatRoutes");
app.use("/chatHome", chatRoutes);

const Chat = require("./models/chatModel");
const User = require("./models/userModel");
const Message = require("./models/messageModel");


io.on('connection', async (socket) => {
    console.log('A user connected: ', socket.id);
    const sender_id = socket.handshake.query.sender_id;
    const user = await User.findByIdAndUpdate(sender_id, { socketId: socket.id });
    if (user) {
        user.isOnline = true;
        user.lastActive = "";
        await user.save();
    }
    const dataObject = {
        receiver_id: user._id,
        isOnline: true
    };
    io.emit("receiverUserStatus", dataObject);

    socket.on("receiverUserStatus", async (data) => {
        const receiverUser = await User.findById(data.receiver_id);
        if (receiverUser) {
            if (receiverUser.isOnline) {
                socket.emit("receiverUserStatus", { receiver_id: data.receiver_id, isOnline: true });
            } else {
                socket.emit("receiverUserStatus", { receiver_id: data.receiver_id, isOnline: false, lastActive: receiverUser.lastActive });
            }
        }
    });

    socket.on('messageFromClient', async (data) => {
        const receiver = await User.findById(data.receiver_id);

        let chat = await Chat.findOne({
            $or: [
                { sender_id: data.sender_id, receiver_id: data.receiver_id },
                { sender_id: data.receiver_id, receiver_id: data.sender_id }
            ]
        });
        if (!chat) {
            chat = new Chat({
                sender_id: data.sender_id,
                receiver_id: data.receiver_id
            });
            await chat.save();
            user.chats.push(chat._id);
            receiver.chats.push(chat._id);
            await user.save();
            await receiver.save();
        }
        const newMessage = new Message({
            message: data.message,
            chat_id: chat._id,
            sender_id: data.sender_id,
            receiver_id: data.receiver_id
        });
        await newMessage.save();

        chat.messages.push(newMessage._id);
        await chat.save();

        const receiver_id = receiver.socketId;
        io.to(receiver_id).emit("messageFromServer", data);
    })

    socket.on("saveUserPeerId", async (peerId) => {
        user.peerId = peerId;
        await user.save();
    });
    let receiverPeerId;
    socket.on("requestPeerId", async (data) => {
        const receiver = await User.findById(data.receiver_id);
        receiverPeerId = receiver.peerId;
        const user = await User.findById(data.sender_id);
        io.to(user.socketId).emit("getReceiverPeerId", receiverPeerId);
        io.to(receiver.socketId).emit("getNewCall");
        console.log(`Sent getPeerId event to receiver: ${user}`);
    });

    socket.on("acceptCall", async (data) => {
        const user = await User.findById(data.sender_id);
        const receiver = await User.findById(data.receiver_id);
        io.to(user.socketId).emit("startCall", receiver.peerId);
    });
    socket.on("rejectCall", async (receiver_id) => {
        const receiver = await User.findById(receiver_id);
        io.to(receiver.socketId).emit("rejectedCall");
    });
    socket.on("endCall", async (receiver_id) => {
        const receiver = await User.findById(receiver_id);
        io.to(receiver.socketId).emit("endedCall");
    })

    socket.on('disconnect', async () => {
        if (user) {
            user.socketId = "";
            user.isOnline = false;
            user.lastActive = Date.now();
            await user.save();
            const dataObject = {
                receiver_id: user._id,
                isOnline: false,
                lastActive: user.lastActive
            };
            io.emit("receiverUserStatus", dataObject);
        }
    });
    socket.on('joinRoom', (roomName) => {
        socket.join(roomName);
        console.log(`User joined room: ${roomName}`);
    });
    socket.on('messageFromClientG', (data) => {
        socket.broadcast.to(data.roomName).emit('messageFromServerG', data);
    })

})

const PORT = process.env.PORT || 9900;
sslServer.listen(PORT, () => {
    console.log(`Secure server is running on https://localhost:${PORT}`);

});
