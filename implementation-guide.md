# MarketingNeo Implementation Guide

## Project Overview

A minimalist marketing chatbot with:
- Frontend: React.js single-page application
- Backend: Express.js API with OpenAI Assistants API integration
- Deployment: AWS (S3, CloudFront, Lambda)

## Architecture Decision

Instead of using Elastic Beanstalk (which was problematic in the previous implementation), we'll use:
- Frontend: S3 + CloudFront (static hosting)
- Backend: AWS Lambda + API Gateway (serverless)
- Security: API Keys for OpenAI and frontend authentication

Benefits of this approach:
- Serverless architecture eliminates server management
- No CORS issues as API Gateway handles it
- Better cost management (pay-per-use)
- Simpler deployment process
- No need for complex Nginx configurations

## Step-by-Step Implementation

### 1. Local Development Setup

```bash
# Create project structure
mkdir marketingneo
cd marketingneo
mkdir frontend backend
```

#### Frontend Setup
```bash
cd frontend
npx create-react-app .
npm install lucide-react @tailwindcss/forms tailwindcss postcss autoprefixer
```

Configure Tailwind CSS:
```javascript
// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/forms")],
}
```

#### Backend Setup
```bash
cd ../backend
npm init -y
npm install express cors dotenv openai
```

### 2. OpenAI Integration

1. Environment Setup:
```bash
# backend/.env
OPENAI_API_KEY=your_api_key_here
ORGANIZATION_ID=your_org_id_here
ASSISTANT_ID=asst_PLQBp59e7qFbVE1rxxFUeKHo  # MarketingNeo assistant
```

2. OpenAI Client Configuration:
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.ORGANIZATION_ID,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'  // Required for Assistants API
  }
});
```

3. Thread Management:
```javascript
// Create a new thread for each conversation
const thread = await openai.beta.threads.create();

// Add message to thread
await openai.beta.threads.messages.create(thread.id, {
  role: "user",
  content: userMessage
});

// Run the assistant
const run = await openai.beta.threads.runs.create(thread.id, {
  assistant_id: process.env.ASSISTANT_ID
});

// Wait for completion
let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
while (runStatus.status !== 'completed') {
  await new Promise(resolve => setTimeout(resolve, 1000));
  runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
}

// Get response
const messages = await openai.beta.threads.messages.list(thread.id);
const response = messages.data[0].content[0].text.value;
```

### 3. Frontend Implementation

1. Environment Setup:
```bash
# frontend/.env
REACT_APP_API_ENDPOINT=http://localhost:3001/chat
```

2. Chat Component:
```javascript
const generateResponse = async (userInput) => {
  try {
    const result = await fetch(process.env.REACT_APP_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          ...conversation.map(msg => ({ role: msg.role, content: msg.content })),
          { role: "user", content: userInput }
        ]
      }),
    });

    const data = await result.json();
    return data.response;
  } catch (error) {
    console.error('Error:', error);
    return 'Sorry, there was an error processing your request.';
  }
};
```

### 4. Backend Implementation

Create `backend/local-server.js`:
```javascript
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

const ASSISTANT_ID = process.env.ASSISTANT_ID;

app.post('/chat', async (req, res) => {
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### 5. AWS Deployment

1. Create Lambda Function:
```bash
cd backend
zip -r function.zip .
aws lambda create-function \
  --function-name marketingneo-api \
  --runtime nodejs18.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/lambda-basic-execution
```

2. Create API Gateway:
```bash
aws apigateway create-rest-api --name marketingneo-api
```

3. Deploy Frontend:
```bash
cd frontend
npm run build
aws s3 sync build/ s3://marketingneo-frontend --delete
```

### 6. Environment Variables

Backend (.env):
```
OPENAI_API_KEY=<your_api_key>
ORGANIZATION_ID=<your_org_id>
ASSISTANT_ID=asst_PLQBp59e7qFbVE1rxxFUeKHo
```

Frontend (.env):
```
REACT_APP_API_ENDPOINT=http://localhost:3001/chat  # Local development
# REACT_APP_API_ENDPOINT=<api_gateway_url>  # Production
```

### 7. Testing

1. Local Testing:
```bash
# Start backend
cd backend
node local-server.js

# Start frontend
cd frontend
npm start
```

2. API Testing:
```bash
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a test press release"}
    ]
  }'
```

### 8. Troubleshooting

1. OpenAI Connection Issues:
   - Verify API key and organization ID
   - Ensure 'OpenAI-Beta: assistants=v2' header is set
   - Check assistant ID exists and is accessible

2. Thread Management:
   - Each request creates a new thread
   - Threads are automatically cleaned up by OpenAI
   - Monitor thread status during runs

3. Error Handling:
   - Check run status for failures
   - Monitor CloudWatch logs in production
   - Implement proper error responses

### 9. Best Practices

1. Security:
   - Never commit API keys to version control
   - Use environment variables for sensitive data
   - Implement proper CORS in production

2. Performance:
   - Monitor thread completion times
   - Implement request timeouts
   - Consider implementing thread pooling for high traffic

3. Maintenance:
   - Keep dependencies updated
   - Monitor OpenAI API changes
   - Implement proper logging

Remember to never commit sensitive information like API keys to version control. Always use environment variables or AWS Secrets Manager for sensitive data.
