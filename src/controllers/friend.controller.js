const FriendService = require('../services/friendService');
const { successResponse, errorResponse } = require('../utils/response');

const FriendController = {
  searchUsers: async (req, res, next) => {
    try {
      const users = await FriendService.searchUsers({
        currentUserId: req.user.id,
        keyword: req.query.keyword,
      });

      successResponse(res, 200, 'Users retrieved successfully', users);
    } catch (error) {
      next(error);
    }
  },

  sendRequest: async (req, res, next) => {
    try {
      const result = await FriendService.sendRequest({
        fromUserId: req.user.id,
        toUserId: req.body.toUserId,
        message: req.body.message,
      });

      successResponse(res, 201, 'Friend request sent successfully', result);
    } catch (error) {
      errorResponse(res, 400, error.message);
    }
  },

  getRequests: async (req, res, next) => {
    try {
      const requests = await FriendService.getRequests(req.user.id);
      successResponse(res, 200, 'Friend requests retrieved successfully', requests);
    } catch (error) {
      next(error);
    }
  },

  acceptRequest: async (req, res, next) => {
    try {
      await FriendService.acceptRequest({
        currentUserId: req.user.id,
        requestId: req.params.id,
      });

      successResponse(res, 200, 'Friend request accepted successfully');
    } catch (error) {
      errorResponse(res, 400, error.message);
    }
  },

  rejectRequest: async (req, res, next) => {
    try {
      await FriendService.rejectRequest({
        currentUserId: req.user.id,
        requestId: req.params.id,
      });

      successResponse(res, 200, 'Friend request rejected successfully');
    } catch (error) {
      errorResponse(res, 400, error.message);
    }
  },

  getFriends: async (req, res, next) => {
    try {
      const friends = await FriendService.getFriends(req.user.id);
      successResponse(res, 200, 'Friends retrieved successfully', friends);
    } catch (error) {
      next(error);
    }
  },

  deleteFriend: async (req, res, next) => {
    try {
      await FriendService.deleteFriend({
        currentUserId: req.user.id,
        friendId: req.params.friendId,
      });

      successResponse(res, 200, 'Friend deleted successfully');
    } catch (error) {
      errorResponse(res, 400, error.message);
    }
  },
};

module.exports = FriendController;