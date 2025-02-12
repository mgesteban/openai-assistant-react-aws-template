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

2. Create and Configure API Gateway:
```bash
# Create API
aws apigateway create-rest-api --name marketingneo-api

# Get API ID and root resource ID
export API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`marketingneo-api`].id' --output text)
export ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)

# Create /chat resource
export RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part chat \
  --query 'id' --output text)

# Create POST method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --authorization-type NONE

# Set up Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:${AWS_REGION}:lambda:path/2015-03-31/functions/arn:aws:lambda:${AWS_REGION}:${AWS_ACCOUNT_ID}:function:marketingneo-api/invocations

# Enable CORS
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --response-parameters "method.response.header.Access-Control-Allow-Origin=true"

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --response-parameters "method.response.header.Access-Control-Allow-Origin='*'"

# Create OPTIONS method for CORS
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE

# Configure OPTIONS method response
aws apigateway put-method-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters "method.response.header.Access-Control-Allow-Headers=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Origin=true"

# Configure OPTIONS integration response
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --type MOCK \
  --request-templates '{"application/json":"{\"statusCode\": 200}"}'

aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method OPTIONS \
  --status-code 200 \
  --response-parameters "method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',method.response.header.Access-Control-Allow-Methods='POST,OPTIONS',method.response.header.Access-Control-Allow-Origin='*'"

# Deploy API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod
```

3. Deploy Frontend:
```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket marketingneo-frontend \
  --region us-west-2 \
  --create-bucket-configuration LocationConstraint=us-west-2

# Configure bucket for static website hosting
aws s3 website s3://marketingneo-frontend \
  --index-document index.html \
  --error-document index.html

# Configure bucket policy for public access
aws s3api put-public-access-block \
  --bucket marketingneo-frontend \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

aws s3api put-bucket-policy \
  --bucket marketingneo-frontend \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::marketingneo-frontend/*"
      }
    ]
  }'

# Build and deploy frontend
cd frontend
npm run build
aws s3 sync build/ s3://marketingneo-frontend --delete

# The frontend will be accessible at:
# http://marketingneo-frontend.s3-website-us-west-2.amazonaws.com
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
# Local development
REACT_APP_API_ENDPOINT=http://localhost:3001/chat

# Production (after API Gateway deployment)
# REACT_APP_API_ENDPOINT=https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod/chat
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
# Test local endpoint
curl -X POST http://localhost:3001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a test press release"}
    ]
  }'

# Test production endpoint
curl -X POST https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Write a test press release"}
    ]
  }'
```

### 8. Troubleshooting

1. CORS Configuration with AWS_PROXY Integration
   - The "Missing Authentication Token" error can be misleading:
     * Often mistaken for an authentication issue
     * Actually indicates either malformed URL or CORS configuration problem
     * Common with browser requests (not with curl/Postman)

   a. Understanding AWS_PROXY Integration CORS:
      * AWS_PROXY (Lambda Proxy) integration passes requests directly to Lambda
      * Standard API Gateway CORS settings don't fully apply
      * Lambda function must include CORS headers in its response
      * Browser makes preflight OPTIONS request before actual POST

   b. Complete CORS Setup Process:
      1. API Gateway Configuration:
         ```bash
         # 1. Set up OPTIONS method
         aws apigateway put-method \
           --rest-api-id <API_ID> \
           --resource-id <RESOURCE_ID> \
           --http-method OPTIONS \
           --authorization-type NONE

         # 2. Configure OPTIONS method response
         aws apigateway put-method-response \
           --rest-api-id <API_ID> \
           --resource-id <RESOURCE_ID> \
           --http-method OPTIONS \
           --status-code 200 \
           --response-parameters "method.response.header.Access-Control-Allow-Headers=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Origin=true"

         # 3. Set up OPTIONS mock integration
         aws apigateway put-integration \
           --rest-api-id <API_ID> \
           --resource-id <RESOURCE_ID> \
           --http-method OPTIONS \
           --type MOCK \
           --request-templates '{"application/json":"{\"statusCode\": 200}"}'

         # 4. Configure OPTIONS integration response
         aws apigateway put-integration-response \
           --rest-api-id <API_ID> \
           --resource-id <RESOURCE_ID> \
           --http-method OPTIONS \
           --status-code 200 \
           --response-parameters "method.response.header.Access-Control-Allow-Headers='Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',method.response.header.Access-Control-Allow-Methods='POST,OPTIONS',method.response.header.Access-Control-Allow-Origin='*'"

         # 5. Configure POST method response to accept CORS headers
         aws apigateway put-method-response \
           --rest-api-id <API_ID> \
           --resource-id <RESOURCE_ID> \
           --http-method POST \
           --status-code 200 \
           --response-parameters "method.response.header.Access-Control-Allow-Origin=true"
         ```

      2. Lambda Function CORS Headers:
         ```javascript
         // For AWS Lambda with serverless-http
         const handler = serverless(app);
         module.exports.handler = async (event, context) => {
           const response = await handler(event, context);
           response.headers = {
             ...response.headers,
             'Access-Control-Allow-Origin': '*',
             'Access-Control-Allow-Methods': 'POST, OPTIONS',
             'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
           };
           return response;
         };
         ```

   c. Testing CORS Configuration:
      1. Test with curl (no CORS restrictions):
         ```bash
         curl -X POST https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod/chat \
           -H "Content-Type: application/json" \
           -d '{"messages":[{"role":"user","content":"test"}]}'
         ```

      2. Test with browser-based request:
         ```javascript
         fetch('https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod/chat', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json'
           },
           body: JSON.stringify({
             messages: [
               { role: "user", content: "test message" }
             ]
           })
         });
         ```

   d. Common CORS Issues:
      * Missing OPTIONS method configuration
      * Incorrect CORS header values
      * Missing CORS headers in Lambda response
      * Malformed API endpoint URL
      * Missing method response configuration
      * Forgetting to deploy API changes

   e. Debugging Steps:
      1. Check browser console for specific CORS errors
      2. Verify OPTIONS method returns correct headers
      3. Confirm Lambda includes CORS headers
      4. Test with curl to isolate CORS issues
      5. Verify API deployment after changes

2. OpenAI Connection Issues:
   - Verify API key and organization ID
   - Ensure 'OpenAI-Beta: assistants=v2' header is set
   - Check assistant ID exists and is accessible

2. Thread Management:
   - Each request creates a new thread
   - Threads are automatically cleaned up by OpenAI
   - Monitor thread status during runs

3. API Gateway Issues:
   - Check Lambda integration is properly configured
   - Verify CORS settings are correct
   - Check CloudWatch logs for Lambda execution errors
   - Test OPTIONS preflight request handling
   - Verify API Gateway deployment to correct stage

4. Error Handling:
   - Check run status for failures
   - Monitor CloudWatch logs in production
   - Implement proper error responses

### 9. Best Practices

1. Security:
   - Never commit API keys to version control
   - Use environment variables for sensitive data
   - Implement proper CORS in production
   - Consider adding API key authentication
   - Use AWS WAF for additional security

2. Performance:
   - Monitor thread completion times
   - Implement request timeouts
   - Consider implementing thread pooling for high traffic
   - Use CloudWatch metrics for monitoring

3. Maintenance:
   - Keep dependencies updated
   - Monitor OpenAI API changes
   - Implement proper logging
   - Regular security audits
   - Monitor AWS resource usage

Remember to never commit sensitive information like API keys to version control. Always use environment variables or AWS Secrets Manager for sensitive data.
