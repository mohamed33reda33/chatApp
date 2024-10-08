const mongoose = require("mongoose");
const { Schema } = mongoose;
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");


const userSchema = mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"]
    },
    image: {
        type: String,
        default: "uploads/profile.jpg"
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Enter valid email"]
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: 8,
        select: false
    },
    confirmPassword: {
        type: String,
        validate: {
            validator: function (el) {
                return this.isModified('password') ? el === this.password : true;
            },
            message: `Passwords are not the same`
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    socketId: {
        type: String,
        default: ""
    },
    peerId: {
        type: String,
        default: ""
    }
    ,
    friends: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    friendRequests: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    groups: [{
        type: Schema.Types.ObjectId,
        ref: 'Group'
    }],
    chats: [{
        type: Schema.Types.ObjectId,
        ref: 'Chat'
    }],
    passwordResetToken: String,
    passwordResetExpires: Date,
    passwordChangedAt: Date,
});

userSchema.pre('validate', function (next) {
    if (this.isModified('password') && !this.confirmPassword) {
        this.invalidate('confirmPassword', 'Please confirm password');
    }
    next();
});

userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 12);
    this.confirmPassword = undefined;
    next();
});
userSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew) return next();
    this.passwordChangedAt = Date.now() - 1000;
    next();
});
userSchema.methods.correctPassword = async function (enteredPassword, userPassword) {
    return await bcrypt.compare(enteredPassword, userPassword);
};

userSchema.methods.generateResetPasswordToken = async function () {
    const resetToken = crypto.randomBytes(32).toString(`hex`);

    this.passwordResetToken = crypto.createHash(`sha256`).update(resetToken).digest("hex");
    this.passwordResetExpires = Date.now() + 1000 * 60 * 10;
    return resetToken;
};


module.exports = mongoose.model("User", userSchema);