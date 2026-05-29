const fs = require('fs');
const path = require('path');

const uploadRoot = path.join(process.cwd(), 'public', 'uploads', 'avatars');

const ensureUploadRoot = () => {
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
};

const getExtension = (mimeType = '') => {
  const normalizedMimeType = String(mimeType).toLowerCase();

  if (normalizedMimeType.includes('png')) return 'png';
  if (normalizedMimeType.includes('webp')) return 'webp';
  if (normalizedMimeType.includes('gif')) return 'gif';

  return 'jpg';
};

const saveAvatarBase64 = ({ userId, base64, mimeType }) => {
  const normalizedBase64 = String(base64 || '').replace(/^data:image\/\w+;base64,/, '');

  if (!normalizedBase64) {
    throw new Error('avatar data is required');
  }

  const buffer = Buffer.from(normalizedBase64, 'base64');

  if (!buffer.length) {
    throw new Error('avatar data is invalid');
  }

  ensureUploadRoot();

  const extension = getExtension(mimeType);
  const filename = `user-${Number(userId)}-${Date.now()}.${extension}`;
  const filePath = path.join(uploadRoot, filename);

  fs.writeFileSync(filePath, buffer);

  return `/uploads/avatars/${filename}`;
};

module.exports = {
  saveAvatarBase64,
};