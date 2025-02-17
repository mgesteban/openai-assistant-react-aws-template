# OpenAI Assistant React AWS Template

A production-ready template for building custom AI assistants using OpenAI's Assistant API, React, and AWS serverless infrastructure. Deploy your own AI assistant with minimal configuration.

## Features

- Powered by OpenAI's Assistant API
- Real-time chat interactions
- Serverless AWS backend
- Modern React frontend
- Sleek UI with Tailwind CSS
- Secure environment variable handling
- Responsive design
- Production-ready setup

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Lucide React (icons)
- Environment variable management

### Backend
- AWS Lambda
- API Gateway
- OpenAI Assistant API
- Express.js (local development)
- CORS support

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- AWS account with CLI configured
- OpenAI API key
- OpenAI organization ID
- OpenAI Assistant ID

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/openai-assistant-react-aws-template.git
   cd openai-assistant-react-aws-template
   ```

2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. Configure environment variables:

   Frontend (.env):
   ```
   REACT_APP_API_ENDPOINT=http://localhost:3001/chat
   ```

   Backend (.env):
   ```
   OPENAI_API_KEY=your_api_key_here
   ORGANIZATION_ID=your_org_id_here
   ASSISTANT_ID=your_assistant_id_here
   ```

4. Start local development:
   ```bash
   # Start backend (from backend directory)
   npm run dev

   # Start frontend (from frontend directory)
   npm start
   ```

## Detailed Setup Guide

### Creating an OpenAI Assistant

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Navigate to Assistants
3. Create a new Assistant or use an existing one
4. Copy the Assistant ID for your .env file

### Local Development

1. Backend Setup:
   ```bash
   cd backend
   npm install
   cp .env.example .env  # Create and configure your .env file
   npm run dev
   ```

2. Frontend Setup:
   ```bash
   cd frontend
   npm install
   cp .env.example .env  # Create and configure your .env file
   npm start
   ```

The application will be available at `http://localhost:3000`

## AWS Deployment

### Backend Deployment

1. Create Lambda Function:
   ```bash
   cd backend
   zip -r function.zip .
   aws lambda create-function \
     --function-name your-function-name \
     --runtime nodejs18.x \
     --handler index.handler \
     --zip-file fileb://function.zip \
     --role your-lambda-role-arn
   ```

2. Configure API Gateway:
   ```bash
   # Create API
   aws apigateway create-rest-api --name your-api-name

   # Get API ID and root resource ID
   export API_ID=$(aws apigateway get-rest-apis --query 'items[?name==`your-api-name`].id' --output text)
   export ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --query 'items[?path==`/`].id' --output text)

   # Create /chat resource and configure methods
   # Follow the commands in implementation-guide.md for detailed setup
   ```

### Frontend Deployment

1. Update production API endpoint:
   ```bash
   # frontend/.env
   REACT_APP_API_ENDPOINT=https://your-api-id.execute-api.your-region.amazonaws.com/prod/chat
   ```

2. Build and deploy to S3:
   ```bash
   cd frontend
   npm run build
   aws s3 sync build/ s3://your-bucket-name --delete
   ```

## Customization

### Modifying the Assistant

1. Update Assistant Configuration:
   - Visit OpenAI platform
   - Modify assistant settings
   - Update ASSISTANT_ID in backend .env

2. Customize Chat Interface:
   - Modify `frontend/src/components/MarketingneoChatbot.js`
   - Update styling in `frontend/src/index.css`

### Adding Features

1. Backend Extensions:
   - Add new routes in `backend/index.js`
   - Implement additional OpenAI API features
   - Add middleware in `backend/local-server.js`

2. Frontend Enhancements:
   - Add new components in `frontend/src/components`
   - Extend state management
   - Implement additional UI features

## Environment Variables

### Frontend
```
REACT_APP_API_ENDPOINT=   # API endpoint URL
```

### Backend
```
OPENAI_API_KEY=          # Your OpenAI API key
ORGANIZATION_ID=         # Your OpenAI organization ID
ASSISTANT_ID=           # Your OpenAI assistant ID
```

## Common Issues and Solutions

1. CORS Issues:
   - Ensure API Gateway CORS is properly configured
   - Check Lambda function CORS headers
   - Verify frontend API endpoint URL

2. Lambda Deployment:
   - Use .lambdaignore to optimize package size
   - Ensure proper IAM roles and permissions
   - Check CloudWatch logs for errors

3. OpenAI Integration:
   - Verify API key and organization ID
   - Ensure assistant ID is correct
   - Check OpenAI API status

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Security

- Never commit .env files
- Keep API keys secure
- Use AWS IAM roles with minimal required permissions
- Regularly update dependencies
- Follow security best practices

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for the Assistant API
- React.js community
- AWS serverless architecture
- Tailwind CSS team

## Support

For support, please open an issue in the repository.
