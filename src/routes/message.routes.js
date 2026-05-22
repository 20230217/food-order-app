const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/message.controller');

router.post('/', MessageController.sendMessage);

router.get('/conversations', MessageController.getUserConversations);

router.get('/conversation', MessageController.getConversationMessages);

module.exports = router;