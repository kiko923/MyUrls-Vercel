import Redis from 'ioredis';

// 从环境变量中读取连接信息
const redis = new Redis(process.env.KV_URL);

export default async function handler(req, res) {
  const { shortKey } = req.query;

  try {
    // 查询 Redis 中是否存在该 shortKey
    const longUrl = await redis.get(shortKey);

    if (longUrl) {
      // 如果存在，进行 302 重定向
      return res.redirect(302, longUrl);
    } else {
      // 如果不存在，返回错误信息
      return res.status(404).json({ error: 'Short URL not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
