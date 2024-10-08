const User = require("../models/userModel");
const asyncWrapper = require('../middlewares/asyncWrapper');
const { signJWT } = require("../utils/signJWT");
const { sendEmail } = require("../utils/email");
const crypto = require("crypto");

const login = asyncWrapper(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select(`+password`);
    if (!user || !await user.correctPassword(password, user.password)) {
        req.flash('loginErrorMessage', 'Check your email and password!');
        return res.render("login", { loginErrorMessage: req.flash('loginErrorMessage')[0], signupErrorMessage: null, forgetPasswordErrorMessage: null });
    }
    const token = signJWT(user._id);
    res.cookie('token', token, { httpOnly: true });
    user.isOnline = true;
    user.lastActive = "";
    await user.save();
    res.redirect('/chatHome');
});

const signup = asyncWrapper(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    if (user) {
        req.flash('signupErrorMessage', 'This email is already used!');
        return res.render("login", { signupErrorMessage: req.flash('signupErrorMessage')[0], loginErrorMessage: null, forgetPasswordErrorMessage: null });
    }
    if (req.body.password.length < 8) {
        req.flash('signupErrorMessage', "This password is less than 8 char!");
        return res.render("login", { signupErrorMessage: req.flash('signupErrorMessage')[0], loginErrorMessage: null, forgetPasswordErrorMessage: null })
    }
    if (req.body.password != req.body.confirmPassword) {
        req.flash('signupErrorMessage', "Password and Confirm Password not match!");
        return res.render("login", { signupErrorMessage: req.flash('signupErrorMessage')[0], loginErrorMessage: null, forgetPasswordErrorMessage: null })
    }

    const image = req.file ? req.file.filename : "profile.jpg";
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        image: image
    });
    const token = signJWT(newUser._id)
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/chatHome');
});

const logout = asyncWrapper(async (req, res, next) => {
    res.clearCookie("token");
    res.redirect('/');
});
const forgetPassword = asyncWrapper(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.resetEmail });
    if (!user) {
        req.flash('forgetPasswordErrorMessage', 'This email does not exist');
        return res.render("login", {
            forgetPasswordErrorMessage: req.flash('forgetPasswordErrorMessage')[0],
            loginErrorMessage: null,
            signupErrorMessage: null
        });
    }
    const resetToken = await user.generateResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    const resetURL = `${req.protocol}://${req.get(`host`)}/auth/resetPassword/${resetToken}`
    const message = `please go to this URL to reset password (${resetURL})`;
    try {
        await sendEmail({
            email: user.email,
            subject: `reset password token (valid for 10m)`,
            message
        });
        return res.redirect("/auth")
    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        user.save({ validateBeforeSave: false });
        req.flash('forgetPasswordErrorMessage', 'Something went wrong, try again!');
        return res.render("login", {
            forgetPasswordErrorMessage: req.flash('forgetPasswordErrorMessage')[0],
            loginErrorMessage: null,
            signupErrorMessage: null
        });
    }
});

const resetPassword = asyncWrapper(async (req, res, next) => {
    const hashedToken = crypto.createHash(`sha256`).update(req.body.ResetToken).digest(`hex`);
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        req.flash('resetPasswordErrorMessage', 'Something went wrong, try again!');
        return res.render(`resetPassword`, {
            resetPasswordErrorMessage: req.flash('resetPasswordErrorMessage')[0]
        });
    }
    if (req.body.newPassword != req.body.confirmNewPassword || req.body.newPassword.length < 8) {
        req.flash('resetPasswordErrorMessage', "Password and Confirm Password not match Or the new password is shorter than 8 letters!");
        return res.render("resetPassword", {
            resetPasswordErrorMessage: req.flash('resetPasswordErrorMessage')[0]
        })
    }

    user.password = req.body.newPassword;;
    user.confirmPassword = req.body.confirmNewPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    return res.render("login", { signupErrorMessage: null, loginErrorMessage: null, forgetPasswordErrorMessage: null });
});

module.exports = { login, signup, forgetPassword, resetPassword, logout };