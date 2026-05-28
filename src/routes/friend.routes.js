const express = require('express');
const router = express.Router();

const FriendController = require('../controllers/friend.controller');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/search', FriendController.searchUsers);
router.post('/requests', FriendController.sendRequest);
router.get('/requests', FriendController.getRequests);
router.post('/requests/:id/accept', FriendController.acceptRequest);
router.post('/requests/:id/reject', FriendController.rejectRequest);
router.get('/', FriendController.getFriends);
router.delete('/:friendId', FriendController.deleteFriend);

module.exports = router;