const router = require("express").Router();
const authController = require("../controllers/authController");
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const fileFilter = (req, file, cb) => {
    const fileType = file.mimetype.split('/')[0];
    if (fileType === 'image') {
        return cb(null, true)
    } else {
        return cb("please select another fil", false)
    }
}

const upload = multer({
    storage: storage,
    fileFilter: fileFilter
});

router.get("/", (req, res) => res.render("login", { signupErrorMessage: null, loginErrorMessage: null, forgetPasswordErrorMessage: null }));
router.post("/login", authController.login);
router.post("/signup", upload.single('image'), authController.signup);
router.get("/logout", authController.logout);

router.post("/forgetPassword", authController.forgetPassword);
router.route("/resetPassword/:ResetToken")
    .get((req, res) => res.render("resetPassword", { resetPasswordErrorMessage: null }))
    .post(authController.resetPassword);

module.exports = router;
