module.exports = async (req, res) => {
  // Enable CORS with more permissive headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.json({
    message: 'API is working perfectly!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    hasDatabase: !!process.env.DATABASE_URL,
    version: '1.1'
  });
};