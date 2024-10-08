const mongoose = require("mongoose");
const { Schema } = mongoose;



const messageSchema = mongoose.Schema({
    message: {
        type: String,
        required: [true, "Message is required"]
    },
    chat_id: {
        type: Schema.Types.ObjectId,
        ref: 'Chat',
        required: [true, "chat_id is required"]
    },
    sender_id: {
        type: String,
        required: [true, "sender_id is required"]
    },
    receiver_id: {
        type: String,
        required: [true, "receiver_id is required"]
    },
    unread: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Message", messageSchema);