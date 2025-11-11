const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      }
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { base64Data, text } = JSON.parse(event.body);

    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    if (!base64Data || base64Data.length === 0) {
      throw new Error('No PDF data provided');
    }

    console.log('Making request to Anthropic API for PDF extraction...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',  // CORRECT MODEL NAME
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64Data
                }
              },
              {
                type: 'text',
                text: text || 'Please extract all the text content from this PDF document.'
              }
            ]
          }
        ]
      })
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);

    if (!response.ok) {
      console.error('Anthropic API error response:', responseText);
      throw new Error(`Anthropic API error: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        error: 'PDF extraction failed', 
        details: error.message,
        content: [{ text: `Error extracting PDF: ${error.message}` }]
      })
    };
  }
};
