import Redis from 'ioredis';

// 从环境变量中读取连接信息
const redis = new Redis(process.env.KV_URL);

// 生成随机字符串的函数（默认生成 6 位）
function generateRandomString(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Base64 解码函数
function base64Decode(str) {
  try {
    return Buffer.from(str, 'base64').toString('utf-8');
  } catch (e) {
    throw new Error('Invalid Base64 string');
  }
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { longUrl, shortKey } = req.body;

    // 检查 longUrl 是否存在
    if (!longUrl) {
      return res.status(200).json({
        Code: 201,
        Message: 'longUrl is required',
      });
    }

    let finalShortKey = shortKey;

    try {
      // 如果提供了 shortKey，检查该 shortKey 是否已存在
      if (finalShortKey) {
        const value = await redis.get(finalShortKey);
        if (value) {
          return res.status(200).json({
            Code: 201,
            Message: `The custom shortKey '${finalShortKey}' already exists.`,
          });
        }
      }

      // 如果没有提供 shortKey，则生成一个随机的 shortKey
      if (!finalShortKey) {
        finalShortKey = generateRandomString();
      }

      // 将 longUrl 进行 Base64 解码
      const decodedUrl = base64Decode(longUrl);

      // 将解码后的 longUrl 存储到 Redis 中
      await redis.set(finalShortKey, decodedUrl);

      const domain = req.headers.host;
      const finalUrl = `https://${domain}/${finalShortKey}`;

      // 返回成功响应
      return res.status(200).json({
        Code: 1,
        Message: 'URL stored successfully',
        ShortUrl: finalUrl,
        longUrl: decodedUrl,
        shortKey: finalShortKey,
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(200).json({
        Code: 500,
        Message: 'Failed to store URL. Internal server error.',
      });
    }
  } else {
    // 仅支持 POST 请求
    return res.status(405).json({
      Code: 405,
      Message: 'Method Not Allowed',
    });
  }
}
