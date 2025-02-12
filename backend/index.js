require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const app = express();
app.use(express.json());

// Initialize AWS Secrets Manager client
const secretsClient = new SecretsManagerClient();
let openai;
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// Function to get OpenAI API key from Secrets Manager
async function getOpenAIKey() {
  try {
    const command = new GetSecretValueCommand({
      SecretId: "marketingneo/openai",
    });
    const response = await secretsClient.send(command);
    const secret = JSON.parse(response.SecretString);
    return secret.OPENAI_API_KEY;
  } catch (error) {
    console.error("Error retrieving secret:", error);
    throw error;
  }
}

// Initialize OpenAI client
async function initializeOpenAI() {
  try {
    const apiKey = await getOpenAIKey();
    openai = new OpenAI({
      apiKey: apiKey,
      organization: process.env.ORGANIZATION_ID,
      defaultHeaders: {
        'OpenAI-Beta': 'assistants=v2'
      }
    });
  } catch (error) {
    console.error("Error initializing OpenAI client:", error);
    throw error;
  }
}

// Initialize OpenAI client before handling requests
app.post('/chat', async (req, res) => {
  if (!openai) {
    try {
      await initializeOpenAI();
    } catch (error) {
      return res.status(500).json({
        error: "Failed to initialize OpenAI client",
        details: error.message
      });
    }
  }
  try {
    if (!ASSISTANT_ID) {
      throw new Error('ASSISTANT_ID environment variable is not set');
    }

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: req.body.messages[req.body.messages.length - 1].content
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      
      if (runStatus.status === 'failed') {
        throw new Error('Assistant run failed');
      }
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    res.json({
      response: lastMessage.content[0].text.value
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

// For AWS Lambda
const serverless = require('serverless-http');

// For AWS Lambda, wrap the response to include CORS headers
const handler = serverless(app);
module.exports.handler = async (event, context) => {
  // Handle OPTIONS preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
      }
    };
  }

  // Handle actual request
  const response = await handler(event, context);
  
  // Add CORS headers to the response
  response.headers = {
    ...response.headers,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
  };
  
  return response;
};
