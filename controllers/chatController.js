const User = require("../models/userModel");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");

const asyncWrapper = require('../middlewares/asyncWrapper');

const chatHome = asyncWrapper(async (req, res, next) => {
    const userchats = await User.findById(req.user).select("chats -_id").populate("chats");
    let receiver = [];

    let message = [];
    for (const chat of userchats.chats) {
        if (req.user._id.toString() === chat.sender_id) {
            receiver.push(await User.findOne({ _id: chat.receiver_id }));
        } else {
            receiver.push(await User.findOne({ _id: chat.sender_id }));
        }
        const lastMessage = await Message.findOne({
            chat_id: chat._id
        }).sort({ timestamp: -1 });
        message.push(lastMessage);
    }
    const userFriendsAndGroups = await User.find({
        $or: [
            { _id: { $in: req.user.friends } },
            { _id: { $in: req.user.groups } }
        ]
    })

    res.render('chatHome', {
        user: req.user,
        userFriendsAndGroups: userFriendsAndGroups,
        userchats: userchats,
        receiver: receiver,
        message: message
    });
});
const chat = asyncWrapper(async (req, res, next) => {
    const receiverUser = await User.findById(req.body.selectedId);
    let chat = await Chat.findOne({
        $or: [
            { sender_id: req.user._id, receiver_id: receiverUser._id },
            { sender_id: receiverUser._id, receiver_id: req.user._id }
        ]
    }).populate('messages');
    if (!chat) {
        chat = new Chat({
            sender_id: req.user._id,
            receiver_id: receiverUser._id
        });
        await chat.save();
        req.user.chats.push(chat._id);
        receiverUser.chats.push(chat._id);
        await req.user.save();
        await receiverUser.save();
    }
    const messages = await Message.find({ chat_id: chat._id }).select("message sender_id receiver_id -_id");

    const infoObject = {
        user: req.user,
        receiverUser: receiverUser,
        chatMessages: JSON.stringify(messages)
    }
    res.render('chat', { infoObject: infoObject })
});

module.exports = { chatHome, chat };