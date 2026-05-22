const WS_URL = 'ws://127.0.0.1:3000/ws/chat';

let socketTask = null;
let connectedUserId = null;
let reconnectTimer = null;
let manualClosed = false;

// 页面可以注册监听函数。
// 比如聊天页和会话列表页都可以监听 new_message。
const listeners = new Set();

const notifyListeners = (message) => {
  listeners.forEach((listener) => {
    try {
      listener(message);
    } catch (error) {
      console.error('聊天实时消息处理失败', error);
    }
  });
};

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const scheduleReconnect = () => {
  clearReconnectTimer();

  // 如果是手动关闭，或者还没有 userId，就不自动重连。
  if (manualClosed || !connectedUserId) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    connectChatSocket(connectedUserId);
  }, 1500);
};

export const connectChatSocket = (userId) => {
  if (!userId) return null;

  // 如果已经连接的是同一个用户，就复用当前 socket。
  if (socketTask && connectedUserId === Number(userId)) {
    return socketTask;
  }

  closeChatSocket();

  manualClosed = false;
  connectedUserId = Number(userId);

  socketTask = uni.connectSocket({
    url: `${WS_URL}?userId=${connectedUserId}`,
    complete: () => {},
  });

  socketTask.onOpen(() => {
    clearReconnectTimer();
  });

  socketTask.onMessage((res) => {
    try {
      const message = JSON.parse(res.data);

      // message 结构示例：
      // {
      //   event: 'new_message',
      //   data: {...消息内容}
      // }
      notifyListeners(message);
    } catch (error) {
      console.error('聊天实时消息解析失败', error);
    }
  });

  socketTask.onClose(() => {
    socketTask = null;
    scheduleReconnect();
  });

  socketTask.onError((error) => {
    console.error('聊天实时连接失败', error);
    socketTask = null;
    scheduleReconnect();
  });

  return socketTask;
};

export const closeChatSocket = () => {
  manualClosed = true;
  clearReconnectTimer();

  if (socketTask) {
    try {
      socketTask.close({
        code: 1000,
        reason: 'manual close',
      });
    } catch (error) {
      console.error('关闭聊天实时连接失败', error);
    }
  }

  socketTask = null;
};

export const onChatSocketMessage = (listener) => {
  listeners.add(listener);

  // 返回一个取消监听函数，页面卸载时调用，避免重复监听。
  return () => {
    listeners.delete(listener);
  };
};