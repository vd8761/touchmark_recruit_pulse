module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Retrieve the secret key from Vercel Environment Variables
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GROQ_API_KEY environment variable in Vercel' });
  }

  try {
    // Forward the exact request payload to Groq
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    
    // Return the Groq response back to the Flutter app
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Error proxying to Groq:', error);
    return res.status(500).json({ error: 'Internal Server Error: Failed to connect to Groq AI' });
  }
};
