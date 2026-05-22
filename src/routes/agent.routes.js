// d:\Uniapp\food-order-app\server\src\routes\agent.routes.js

const express = require('express');
const router = express.Router();
const AgentController = require('../controllers/agent.controller');

// POST /api/agent/chat
router.post('/chat', AgentController.chat);

module.exports = router;
