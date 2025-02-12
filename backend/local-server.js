require('dotenv').config();
const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.ORGANIZATION_ID,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
});

// Use the assistant ID from environment variables
const ASSISTANT_ID = process.env.ASSISTANT_ID;

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, {
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  next();
});

app.post('/chat', async (req, res) => {
  try {
    console.log('Processing chat request:', {
      body: req.body,
      messages: req.body.messages
    });

    // Validate request body
    if (!req.body.messages || !Array.isArray(req.body.messages) || req.body.messages.length === 0) {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({
        error: "Bad Request",
        details: "Messages array is required and must not be empty"
      });
    }

    // Verify assistant ID is available
    if (!ASSISTANT_ID) {
      throw new Error('ASSISTANT_ID environment variable is not set');
    }

    // Create a thread
    console.log('Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);

    // Add a message to the thread
    console.log('Adding message to thread...');
    const userMessage = req.body.messages[req.body.messages.length - 1].content;
    console.log('User message:', userMessage);
    
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userMessage
    });

    // Run the assistant
    console.log('Starting assistant run...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });
    console.log('Run created:', run.id);

    // Wait for the run to complete
    console.log('Waiting for run to complete...');
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      console.log('Run status:', runStatus.status);
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      
      if (runStatus.status === 'failed') {
        console.error('Run failed:', runStatus);
        throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
    }

    // Get the messages
    console.log('Getting messages...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];
    console.log('Assistant response:', lastMessage.content[0].text.value);

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

// Test OpenAI connection on startup
const testOpenAIConnection = async () => {
  try {
    console.log('Testing OpenAI connection...');
    console.log('Using API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    console.log('Using Organization ID:', process.env.ORGANIZATION_ID ? 'Present' : 'Missing');

    // Try to list assistants as a connection test
    const assistants = await openai.beta.assistants.list();
    console.log('OpenAI connection successful. Found', assistants.data.length, 'assistants');
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
};

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await testOpenAIConnection();
});
