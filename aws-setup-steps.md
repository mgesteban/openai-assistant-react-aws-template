# Steps to Get API Endpoint

1. **AWS Account Setup**
   - Ensure you have an AWS account
   - Install AWS CLI
   - Configure AWS credentials using `aws configure`

2. **Create Lambda Function**
   ```bash
   # Create deployment package
   cd backend
   zip -r function.zip .

   # Create Lambda function
   aws lambda create-function \
     --function-name marketingneo-api \
     --runtime nodejs18.x \
     --handler index.handler \
     --zip-file fileb://function.zip \
     --role arn:aws:iam::<YOUR_ACCOUNT_ID>:role/lambda-basic-execution
   ```

3. **Create API Gateway**
   ```bash
   # Create API
   aws apigateway create-rest-api --name marketingneo-api

   # Get the API ID from the output above, then:
   aws apigateway get-resources --rest-api-id <API_ID>

   # Create resource
   aws apigateway create-resource \
     --rest-api-id <API_ID> \
     --parent-id <ROOT_ID> \
     --path-part chat

   # Create POST method
   aws apigateway put-method \
     --rest-api-id <API_ID> \
     --resource-id <RESOURCE_ID> \
     --http-method POST \
     --authorization-type NONE

   # Deploy API
   aws apigateway create-deployment \
     --rest-api-id <API_ID> \
     --stage-name prod
   ```

4. **Get API Endpoint**
   - After deployment, your API endpoint will be:
   `https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod/chat`
   - This is the URL you'll use for REACT_APP_API_ENDPOINT in frontend/.env

5. **Update Environment Variables**
   ```bash
   # Update frontend/.env with the API endpoint
   REACT_APP_API_ENDPOINT=https://<API_ID>.execute-api.<REGION>.amazonaws.com/prod/chat
   ```

Note: Before deploying, you'll need:
1. AWS account and credentials
2. IAM role for Lambda execution
3. OpenAI API key for backend/.env

Would you like me to help you set up any of these prerequisites?
