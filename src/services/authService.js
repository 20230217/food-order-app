const crypto = require('crypto');
const UserModel = require('../models/userModel');
const { createToken } = require('../utils/token');

const hashPassword = (password) => {
  return crypto
    .createHash('sha256')
    .update(String(password))
    .digest('hex');
};

const sanitizeUser = (user) => {
  if (!user) return null;

  // 不能把 password 返回给前端
  const { password, ...safeUser } = user;
  return safeUser;
};

const createLoginResult = (user) => {
  const safeUser = sanitizeUser(user);

  const token = createToken({
    userId: safeUser.id,
    openid: safeUser.openid,
  });

  return {
    token,
    user: safeUser,
  };
};

const normalizeNickname = (nickname) => {
  const value = String(nickname || '').trim();
  return value || '微信用户';
};

const requestWechatSession = async (code) => {
  const appid = process.env.WECHAT_APPID;
  const secret = process.env.WECHAT_SECRET;

  if (!appid || !secret) {
    throw new Error('Missing WECHAT_APPID or WECHAT_SECRET');
  }

  const url = new URL('https://api.weixin.qq.com/sns/jscode2session');
  url.searchParams.set('appid', appid);
  url.searchParams.set('secret', secret);
  url.searchParams.set('js_code', code);
  url.searchParams.set('grant_type', 'authorization_code');

  // Node 18+ 自带 fetch。
  // 如果你的 Node 版本太低，需要升级 Node 或改用 https 模块。
  const response = await fetch(url);
  const data = await response.json();

  if (data.errcode) {
    throw new Error(data.errmsg || 'Wechat login failed');
  }

  if (!data.openid) {
    throw new Error('Wechat openid is empty');
  }

  return data;
};

const AuthService = {
  wechatLogin: async ({ code, nickname, avatarUrl }) => {
    if (!code) {
      throw new Error('code is required');
    }

    // 1. 用 code 向微信服务器换 openid
    const session = await requestWechatSession(code);
    const openid = session.openid;

    // 2. 用 openid 查找用户
    let user = await UserModel.findByOpenid(openid);

    // 3. 不存在则创建用户
    if (!user) {
      const result = await UserModel.createUser({
        openid,
        // 新用户第一次登录时，如果前端没有传昵称，就使用默认昵称“微信用户”
        nickname: normalizeNickname(nickname),
        // 新用户第一次登录时，如果前端没有传头像，就先为空
        avatarUrl,
      });
      user = await UserModel.findById(result.insertId);
    } else {
      // 4. 已存在用户重新登录时，不要覆盖用户已经保存过的昵称和头像。
      // 因为 uni.login 只能拿 code，不能拿真实微信昵称和头像。
      // 用户资料应该由“编辑资料”页面单独更新。
      user = await UserModel.findById(user.id);
    }
    // 5. 返回 token + user
    return createLoginResult(user);
  },

  mockLogin: async ({ username, nickname, password, avatarUrl }) => {
    const normalizedUsername = String(username || nickname || '').trim();
    const normalizedPassword = String(password || '');

    if (!normalizedUsername) {
      throw new Error('username is required');
    }

    if (!normalizedPassword) {
      throw new Error('password is required');
    }

    const passwordHash = hashPassword(normalizedPassword);
    let user = await UserModel.findByUsername(normalizedUsername);

    if (!user) {
      const result = await UserModel.createUser({
        username: normalizedUsername,
        password: passwordHash,
        openid: `mock_${normalizedUsername}`,
        nickname: nickname || normalizedUsername,
        avatarUrl,
      });

      user = await UserModel.findById(result.insertId);
      return createLoginResult(user);
    }

    if (user.password !== passwordHash) {
      throw new Error('Invalid username or password');
    }

    await UserModel.updateProfile({
      id: user.id,
      nickname: nickname || user.nickname || normalizedUsername,
      avatarUrl: avatarUrl || user.avatarUrl,
    });

    user = await UserModel.findById(user.id);

    return createLoginResult(user);
  },

  updateProfile: async ({ userId, nickname, avatarUrl }) => {
    const currentUser = await UserModel.findById(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }
    // 如果某个字段没有传，就保留原来的值
    await UserModel.updateProfile({
      id: userId,
      nickname: nickname || currentUser.nickname || '微信用户',
      avatarUrl: avatarUrl || currentUser.avatarUrl || '',
    });

    const updatedUser = await UserModel.findById(userId);
    // 返回给前端前，去掉 password
    return sanitizeUser(updatedUser);
  },
};

module.exports = AuthService;