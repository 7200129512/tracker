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

  try {
    // Return empty investments data for now (you can add investments later)
    const staticInvestmentData = [];

    res.status(200).json({ data: staticInvestmentData });
  } catch (error) {
    console.error('Investments API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      data: []
    });
  }
};