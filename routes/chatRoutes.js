const router = require("express").Router();
const chatController = require("../controllers/chatController");
const { verifyToken } = require('../middlewares/verifyToken');


router.get("/", verifyToken, chatController.chatHome);
router.get("/chat", verifyToken, chatController.chat);
router.post("/chat", verifyToken, chatController.chat);



module.exports = router;