const FriendModel = require('../models/friendModel');

const toUserId = (value) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const safeUser = (user) => {
  if (!user) return null;
  const { openid, ...rest } = user;
  return rest;
};

function toUserIdValue(value) {
  const userId = toUserId(value);
  if (!userId) {
    throw new Error('Invalid user id');
  }
  return userId;
}

const FriendService = {
  searchUsers: async ({ currentUserId, keyword }) => {
    const normalizedKeyword = String(keyword || '').trim();

    if (!normalizedKeyword) {
      return [];
    }

    const users = await FriendModel.searchUsers({
      currentUserId,
      keyword: normalizedKeyword,
    });

    return users.map(safeUser);
  },

  sendRequest: async ({ fromUserId, toUserId, message }) => {
    const normalizedFromUserId = toUserIdValue(fromUserId);
    const normalizedToUserId = toUserIdValue(toUserId);

    if (normalizedFromUserId === normalizedToUserId) {
      throw new Error('不能添加自己为好友');
    }

    const targetUser = await FriendModel.findUserById(normalizedToUserId);

    if (!targetUser) {
      throw new Error('用户不存在');
    }

    const alreadyFriends = await FriendModel.areFriends(
      normalizedFromUserId,
      normalizedToUserId
    );

    if (alreadyFriends) {
      throw new Error('你们已经是好友了');
    }

    const reverseRequest = await FriendModel.findRequestBetween(
      normalizedToUserId,
      normalizedFromUserId
    );

    if (reverseRequest?.status === 'pending') {
      await FriendModel.acceptRequest({
        requestId: reverseRequest.id,
        fromUserId: normalizedToUserId,
        toUserId: normalizedFromUserId,
      });

      return { accepted: true };
    }

    const existingRequest = await FriendModel.findRequestBetween(
      normalizedFromUserId,
      normalizedToUserId
    );

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        throw new Error('好友申请已发送，请等待对方处理');
      }

      await FriendModel.updateRequestToPending({
        requestId: existingRequest.id,
        message,
      });

      return { resent: true };
    }

    const result = await FriendModel.createRequest({
      fromUserId: normalizedFromUserId,
      toUserId: normalizedToUserId,
      message,
    });

    return { id: result.insertId };
  },

  getRequests: async (userId) => {
    const normalizedUserId = toUserIdValue(userId);

    const [received, sent] = await Promise.all([
      FriendModel.getReceivedRequests(normalizedUserId),
      FriendModel.getSentRequests(normalizedUserId),
    ]);

    return { received, sent };
  },

  acceptRequest: async ({ currentUserId, requestId }) => {
    const normalizedUserId = toUserIdValue(currentUserId);
    const normalizedRequestId = toUserIdValue(requestId);
    const request = await FriendModel.findRequestById(normalizedRequestId);

    if (!request || Number(request.to_user_id) !== normalizedUserId) {
      throw new Error('好友申请不存在');
    }

    if (request.status !== 'pending') {
      throw new Error('好友申请已处理');
    }

    await FriendModel.acceptRequest({
      requestId: request.id,
      fromUserId: request.from_user_id,
      toUserId: request.to_user_id,
    });

    return true;
  },

  rejectRequest: async ({ currentUserId, requestId }) => {
    const normalizedUserId = toUserIdValue(currentUserId);
    const normalizedRequestId = toUserIdValue(requestId);
    const request = await FriendModel.findRequestById(normalizedRequestId);

    if (!request || Number(request.to_user_id) !== normalizedUserId) {
      throw new Error('好友申请不存在');
    }

    if (request.status !== 'pending') {
      throw new Error('好友申请已处理');
    }

    await FriendModel.rejectRequest(request.id);

    return true;
  },

  getFriends: async (userId) => {
    return FriendModel.getFriends(toUserIdValue(userId));
  },

  deleteFriend: async ({ currentUserId, friendId }) => {
    const normalizedUserId = toUserIdValue(currentUserId);
    const normalizedFriendId = toUserIdValue(friendId);

    await FriendModel.deleteFriend({
      userId: normalizedUserId,
      friendId: normalizedFriendId,
    });

    return true;
  },
};

module.exports = FriendService;