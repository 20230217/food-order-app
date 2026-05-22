const crypto = require('crypto');

// 保存在线用户连接：
// userId -> Set<socket>
// 例如：用户B在线，就会有 clientsByUserId.get(2)
const clientsByUserId = new Map();

const toUserId = (value) => {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
};

const parseUserIdFromUrl = (url = '') => {
  try {
    const parsedUrl = new URL(url, 'http://localhost');
    return toUserId(parsedUrl.searchParams.get('userId'));
  } catch (error) {
    return null;
  }
};

// 服务端发送 WebSocket 文本帧。
// 前端 uni.connectSocket 收到的就是这里写出去的数据。
const encodeFrame = (data) => {
  const payload = Buffer.from(JSON.stringify(data));
  const length = payload.length;

  if (length < 126) {
    return Buffer.concat([Buffer.from([0x81, length]), payload]);
  }

  if (length < 65536) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
    return Buffer.concat([header, payload]);
  }

  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(length), 2);
  return Buffer.concat([header, payload]);
};

// 解析前端发来的 WebSocket 帧。
// 目前主要用于处理 ping/close，聊天消息仍然走 HTTP POST /api/messages。
const decodeFrame = (buffer) => {
  if (!buffer || buffer.length < 2) return null;

  const opcode = buffer[0] & 0x0f;

  // 0x8 表示关闭连接
  if (opcode === 0x8) {
    return { type: 'close' };
  }

  // 0x1 表示文本消息；其他类型暂时忽略
  if (opcode !== 0x1) {
    return null;
  }

  let offset = 2;
  let length = buffer[1] & 0x7f;
  const masked = (buffer[1] & 0x80) === 0x80;

  if (length === 126) {
    if (buffer.length < offset + 2) return null;
    length = buffer.readUInt16BE(offset);
    offset += 2;
  } else if (length === 127) {
    if (buffer.length < offset + 8) return null;
    length = Number(buffer.readBigUInt64BE(offset));
    offset += 8;
  }

  // 浏览器/小程序客户端发来的帧必须带 mask
  if (!masked || buffer.length < offset + 4 + length) return null;

  const mask = buffer.subarray(offset, offset + 4);
  offset += 4;

  const payload = Buffer.alloc(length);

  for (let index = 0; index < length; index += 1) {
    payload[index] = buffer[offset + index] ^ mask[index % 4];
  }

  try {
    return JSON.parse(payload.toString('utf8'));
  } catch (error) {
    return null;
  }
};

const addClient = (userId, socket) => {
  if (!clientsByUserId.has(userId)) {
    clientsByUserId.set(userId, new Set());
  }

  clientsByUserId.get(userId).add(socket);
};

const removeClient = (userId, socket) => {
  const sockets = clientsByUserId.get(userId);

  if (!sockets) return;

  sockets.delete(socket);

  if (sockets.size === 0) {
    clientsByUserId.delete(userId);
  }
};

const sendToSocket = (socket, data) => {
  if (!socket || socket.destroyed || socket.writableEnded) return;

  try {
    socket.write(encodeFrame(data));
  } catch (error) {
    socket.destroy();
  }
};

const sendToUser = (userId, data) => {
  const normalizedUserId = toUserId(userId);

  if (!normalizedUserId) return;

  const sockets = clientsByUserId.get(normalizedUserId);

  if (!sockets) return;

  // 一个用户可能在多个窗口/设备在线，所以这里遍历所有 socket。
  sockets.forEach((socket) => {
    sendToSocket(socket, data);
  });
};

// 发送消息成功后调用这个函数。
// 它会同时通知发送方和接收方，让两个页面都能实时刷新。
const broadcastMessage = (message) => {
  if (!message) return;

  const payload = {
    event: 'new_message',
    data: message,
  };

  console.log(`[chat-ws] Broadcast message ${message.id}: ${message.senderId} -> ${message.receiverId}`);
  sendToUser(message.senderId, payload);
  sendToUser(message.receiverId, payload);
};

const registerChatSocketServer = (server) => {
  server.on('upgrade', (req, socket) => {
    const parsedUrl = new URL(req.url || '', 'http://localhost');

    // 只处理 /ws/chat，其它 upgrade 请求忽略
    if (parsedUrl.pathname !== '/ws/chat') {
      return;
    }

    const userId = parseUserIdFromUrl(req.url);

    if (!userId) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    const key = req.headers['sec-websocket-key'];

    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
      socket.destroy();
      return;
    }

    // WebSocket 握手要求：Sec-WebSocket-Accept = sha1(key + 固定 GUID)
    const acceptKey = crypto
      .createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');

    socket.write([
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey}`,
      '\r\n',
    ].join('\r\n'));

    // 握手成功后，把当前 socket 记录到这个 userId 下。
    socket.userId = userId;
    addClient(userId, socket);

    console.log(`[chat-ws] Chat socket connected: userId=${userId}`);

    // 告诉前端已经连接成功。
    sendToSocket(socket, {
      event: 'connected',
      data: { userId },
    });

    socket.on('data', (buffer) => {
      const message = decodeFrame(buffer);

      if (!message) return;

      if (message.type === 'close') {
        socket.end();
        return;
      }

      // 预留 ping/pong，后续可做心跳保活。
      if (message.event === 'ping') {
        sendToSocket(socket, {
          event: 'pong',
          data: { time: Date.now() },
        });
      }
    });

    socket.on('close', () => {
      removeClient(userId, socket);
      console.log(`[chat-ws] Chat socket closed: userId=${userId}`);
    });

    socket.on('error', () => {
      removeClient(userId, socket);
    });
  });
};

module.exports = {
  registerChatSocketServer,
  broadcastMessage,
};