const mongoose = require("mongoose");
const { Schema } = mongoose;


const chatSchema = mongoose.Schema({
    messages: [{
        type: Schema.Types.ObjectId,
        ref: 'Message',
    }],
    sender_id: {
        type: String,
    },
    receiver_id: {
        type: String,
    },
    group_id: {
        type: String,
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Chat", chatSchema);