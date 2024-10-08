const router = require("express").Router();
const friendsController = require("../controllers/friendsController");
const { verifyToken } = require('../middlewares/verifyToken');


router.get("/", verifyToken, friendsController.friendsHome);
router.post("/addFriend", verifyToken, friendsController.addFriend)
router.post("/deleteFriend", verifyToken, friendsController.deleteFriend)
router.post("/confirmFriendRequests", verifyToken, friendsController.confirmFriendRequests)
router.post("/rejectFriendRequests", verifyToken, friendsController.rejectFriendRequests)


module.exports = router;