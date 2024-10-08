const User = require("../models/userModel");
const Message = require("../models/messageModel");
const Chat = require("../models/chatModel");
const asyncWrapper = require('../middlewares/asyncWrapper');
const mongoose = require('mongoose');


const friendsHome = asyncWrapper(async (req, res, next) => {
    const user = await User.findById(req.user._id).populate('friends friendRequests');
    const errorMessage = req.flash("errorMessage")[0];
    return res.render('friends', { user: user, errorMessage: errorMessage });
});
const addFriend = asyncWrapper(async (req, res, next) => {
    if (mongoose.Types.ObjectId.isValid(req.body.friendId)) {
        if (req.user._id.toString() == req.body.friendId) {
            req.flash("errorMessage", "This id is for you");
            return res.redirect("/friends")
        }
        const friend = await User.findById(req.body.friendId);
        if (!friend) {
            req.flash("errorMessage", "Not found any user by this id");
            return res.redirect("/friends")
        }
        if (req.user.friends.includes(req.body.friendId)) {
            req.flash("errorMessage", "This user is already your friend");
            return res.redirect("/friends");
        }
        if (friend.friendRequests.includes(req.user._id)) {
            req.flash("errorMessage", "You already sent friend request");
            return res.redirect("/friends");
        }

        friend.friendRequests.push(req.user._id);
        friend.confirmPassword = undefined;
        await friend.save();
        return res.redirect("/friends");
    } else {
        req.flash("errorMessage", "Invalid ID format");
        return res.redirect("/friends");
    }
});
const confirmFriendRequests = asyncWrapper(async (req, res, next) => {
    const friend = await User.findById(req.body.friendId);
    req.user.friends.push(req.body.friendId);
    friend.friends.push(req.user._id);

    const userIndex = req.user.friendRequests.indexOf(friend._id);
    if (userIndex !== -1) {
        req.user.friendRequests.splice(userIndex, 1);
    }
    req.user.confirmPassword = undefined;
    friend.confirmPassword = undefined;
    await req.user.save();
    await friend.save();
    return res.redirect("/friends");
});

const rejectFriendRequests = asyncWrapper(async (req, res, next) => {
    const userIndex = req.user.friendRequests.indexOf(req.body.friendId);
    if (userIndex !== -1) {
        req.user.friendRequests.splice(userIndex, 1);
    }
    req.user.confirmPassword = undefined;
    await req.user.save();
    return res.redirect("/friends");
});
const deleteFriend = asyncWrapper(async (req, res, next) => {
    const friend = await User.findById(req.body.friendId);
    var userIndex = req.user.friends.indexOf(req.body.friendId);
    if (userIndex !== -1) {
        req.user.friends.splice(userIndex, 1);
    }
    var friendIndex = friend.friends.indexOf(req.user._id);
    if (friendIndex !== -1) {
        friend.friends.splice(friendIndex, 1);
    }
    const chat = await Chat.findOne({
        $or: [
            { sender_id: req.user._id, receiver_id: friend._id },
            { sender_id: friend._id, receiver_id: req.user._id }
        ]
    });
    if (chat) {
        await Message.deleteMany({ chat_id: chat._id });
        const userChatIndex = req.user.chats.indexOf(chat._id);
        if (userChatIndex !== -1) {
            req.user.chats.splice(userChatIndex, 1);
        }
        const friendChatIndex = friend.chats.indexOf(chat._id);
        if (friendChatIndex !== -1) {
            friend.chats.splice(friendChatIndex, 1);
        }
        await Chat.deleteOne({ _id: chat._id })
    }

    req.user.confirmPassword = undefined;
    friend.confirmPassword = undefined;
    await req.user.save();
    await friend.save();
    return res.redirect("/friends");
})


module.exports = { friendsHome, addFriend, confirmFriendRequests, rejectFriendRequests, deleteFriend };