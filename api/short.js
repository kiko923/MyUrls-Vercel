import Redis from 'ioredis';
import formidable from 'formidable';

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
  return Buffer.from(str, 'base64').toString('utf-8');
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // 尝试从 req.body 获取 longUrl 和 shortKey
    let { longUrl, shortKey } = req.body;

    // 如果 req.body 没有值，则从 FormData 中获取
    if (!longUrl || !shortKey) {
      const form = new formidable.IncomingForm();

      form.parse(req, async (err, fields, files) => {
        if (err) {
          return res.status(500).json({ error: 'Form parsing failed' });
        }

        // 从 FormData 中获取 longUrl 和 shortKey
        longUrl = fields.longUrl || longUrl;
        shortKey = fields.shortKey || shortKey;

        // 如果 longUrl 或 shortKey 仍然没有值，返回错误
        if (!longUrl) {
          return res.status(200).json({
            Code: 201,
            Message: 'longUrl is required'
          });
        }

        // 如果没有传入 shortKey，则生成一个随机 shortKey
        let finalShortKey = shortKey;
        // 检查是否传入 finalShortKey 值
        if (finalShortKey) {
          const value = await redis.get(finalShortKey);
          if (value) {
            return res.status(200).json({
              Code: 201,
              Message: `The custom shortKey '${finalShortKey}' already exists.`
            });
          }
        }

        if (!finalShortKey) {
          finalShortKey = generateRandomString(); // 默认生成 6 位随机字符串
        }

        try {
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
            shortKey: finalShortKey
          });
        } catch (error) {
          console.error('Error:', error);
          return res.status(200).json({
            Code: 201,
            Message: 'Failed to store URL'
          });
        }
      });

      return; // 这里需要返回，避免继续执行后续的代码
    }

    // 如果 req.body 已经有值，直接处理
    let finalShortKey = shortKey;

    // 如果没有传入 shortKey，则生成一个随机 shortKey
    if (finalShortKey) {
      const value = await redis.get(finalShortKey);
      if (value) {
        return res.status(200).json({
          Code: 201,
          Message: `The custom shortKey '${finalShortKey}' already exists.`
        });
      }
    }

    if (!finalShortKey) {
      finalShortKey = generateRandomString(); // 默认生成 6 位随机字符串
    }

    try {
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
        shortKey: finalShortKey
      });
    } catch (error) {
      console.error('Error:', error);
      return res.status(200).json({
        Code: 201,
        Message: 'Failed to store URL'
      });
    }
  } else {
    // 仅支持 POST 请求
    return res.status(405).json({
      Code: 201,
      Message: 'Method Not Allowed'
    });
  }
}
