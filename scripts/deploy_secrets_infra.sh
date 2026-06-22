#!/bin/bash
# Deploy AWS Secrets Manager infrastructure and Lambda rotation functions

set -e

ENVIRONMENT="${1:-production}"
AWS_REGION="${2:-us-east-1}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "========================================"
echo "Deploying Secrets Infrastructure"
echo "========================================"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# Function to check if Lambda function exists
function lambda_exists() {
    aws lambda get-function --function-name "$1" --region "$AWS_REGION" &>/dev/null
    return $?
}

# 1. Create IAM role for Lambda
echo "Creating Lambda execution role..."
ROLE_NAME="silxarcrm-credential-rotation-role"
ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" 2>/dev/null | jq -r '.Role.Arn' || echo "")

if [ -z "$ROLE_ARN" ]; then
    ROLE_ARN=$(aws iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{
                "Effect": "Allow",
                "Principal": {"Service": "lambda.amazonaws.com"},
                "Action": "sts:AssumeRole"
            }]
        }' \
        --query 'Role.Arn' \
        --output text)
    echo "✓ Created role: $ROLE_ARN"
else
    echo "✓ Role exists: $ROLE_ARN"
fi

# 2. Attach policies
echo "Attaching policies..."
aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" 2>/dev/null || true

# Create inline policy for Secrets Manager access
aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name "SecretsManagerAccess" \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:UpdateSecret",
                    "secretsmanager:RotateSecret"
                ],
                "Resource": [
                    "arn:aws:secretsmanager:'$AWS_REGION':'$ACCOUNT_ID':secret:silxarcrm/'$ENVIRONMENT'/*"
                ]
            },
            {
                "Effect": "Allow",
                "Action": [
                    "sns:Publish"
                ],
                "Resource": "arn:aws:sns:'$AWS_REGION':'$ACCOUNT_ID':silxarcrm-credential-rotation"
            }
        ]
    }' 2>/dev/null || true

echo "✓ Policies attached"

# 3. Create SNS topic for notifications
echo "Creating SNS topic..."
TOPIC_ARN=$(aws sns create-topic \
    --name silxarcrm-credential-rotation \
    --region "$AWS_REGION" \
    --query 'TopicArn' \
    --output text)
echo "✓ Topic: $TOPIC_ARN"

# 4. Package Lambda function
echo "Packaging Lambda function..."
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Create temporary directory for Lambda package
LAMBDA_DIR=$(mktemp -d)
cp scripts/lambda_credential_rotator.py "$LAMBDA_DIR/lambda_function.py"

# Create requirements.txt for Lambda
cat > "$LAMBDA_DIR/requirements.txt" << 'EOF'
boto3>=1.26.0
twilio>=8.0.0
httpx>=0.23.0
EOF

# Install dependencies
pip install -q -r "$LAMBDA_DIR/requirements.txt" -t "$LAMBDA_DIR/"

# Create deployment package
cd "$LAMBDA_DIR"
zip -r -q "lambda_function.zip" .
LAMBDA_ZIP="$LAMBDA_DIR/lambda_function.zip"

# 5. Deploy or update Lambda function
LAMBDA_NAME="rotate-silxarcrm-credentials"

if lambda_exists "$LAMBDA_NAME"; then
    echo "Updating Lambda function..."
    LAMBDA_ARN=$(aws lambda update-function-code \
        --function-name "$LAMBDA_NAME" \
        --zip-file "fileb://$LAMBDA_ZIP" \
        --region "$AWS_REGION" \
        --query 'FunctionArn' \
        --output text)
    echo "✓ Updated: $LAMBDA_ARN"
else
    echo "Creating Lambda function..."
    LAMBDA_ARN=$(aws lambda create-function \
        --function-name "$LAMBDA_NAME" \
        --runtime python3.11 \
        --role "$ROLE_ARN" \
        --handler lambda_function.lambda_handler \
        --zip-file "fileb://$LAMBDA_ZIP" \
        --timeout 300 \
        --memory-size 256 \
        --region "$AWS_REGION" \
        --environment "Variables={AWS_REGION=$AWS_REGION,ENVIRONMENT=$ENVIRONMENT}" \
        --query 'FunctionArn' \
        --output text)
    echo "✓ Created: $LAMBDA_ARN"
fi

# 6. Create EventBridge rule for automatic rotation
echo "Creating EventBridge rules for automatic rotation..."

# Gemini rotation (every 90 days)
aws events put-rule \
    --name "rotate-silxarcrm-gemini" \
    --schedule-expression "rate(90 days)" \
    --state ENABLED \
    --region "$AWS_REGION" 2>/dev/null || true

aws events put-targets \
    --rule "rotate-silxarcrm-gemini" \
    --targets "Id"="1","Arn"="$LAMBDA_ARN","RoleArn"="arn:aws:iam::$ACCOUNT_ID:role/service-role/EventBridgeLambdaRole","Input"="{\"service\":\"gemini\",\"environment\":\"$ENVIRONMENT\"}" \
    --region "$AWS_REGION" 2>/dev/null || true

# Twilio rotation (every 60 days)
aws events put-rule \
    --name "rotate-silxarcrm-twilio" \
    --schedule-expression "rate(60 days)" \
    --state ENABLED \
    --region "$AWS_REGION" 2>/dev/null || true

aws events put-targets \
    --rule "rotate-silxarcrm-twilio" \
    --targets "Id"="1","Arn"="$LAMBDA_ARN","RoleArn"="arn:aws:iam::$ACCOUNT_ID:role/service-role/EventBridgeLambdaRole","Input"="{\"service\":\"twilio\",\"environment\":\"$ENVIRONMENT\"}" \
    --region "$AWS_REGION" 2>/dev/null || true

# Webhook rotation (every 30 days)
aws events put-rule \
    --name "rotate-silxarcrm-webhook" \
    --schedule-expression "rate(30 days)" \
    --state ENABLED \
    --region "$AWS_REGION" 2>/dev/null || true

aws events put-targets \
    --rule "rotate-silxarcrm-webhook" \
    --targets "Id"="1","Arn"="$LAMBDA_ARN","RoleArn"="arn:aws:iam::$ACCOUNT_ID:role/service-role/EventBridgeLambdaRole","Input"="{\"service\":\"webhook\",\"environment\":\"$ENVIRONMENT\"}" \
    --region "$AWS_REGION" 2>/dev/null || true

echo "✓ EventBridge rules created"

# 7. Create CloudWatch Log Group
echo "Creating CloudWatch Log Group..."
aws logs create-log-group \
    --log-group-name "/aws/lambda/rotate-silxarcrm-credentials" \
    --region "$AWS_REGION" 2>/dev/null || true

aws logs put-retention-policy \
    --log-group-name "/aws/lambda/rotate-silxarcrm-credentials" \
    --retention-in-days 90 \
    --region "$AWS_REGION" 2>/dev/null || true

echo "✓ Log group created"

# Clean up
rm -rf "$LAMBDA_DIR"

# Summary
echo ""
echo "========================================"
echo "Deployment Complete"
echo "========================================"
echo "✓ SNS Topic: $TOPIC_ARN"
echo "✓ Lambda Function: $LAMBDA_NAME ($LAMBDA_ARN)"
echo "✓ IAM Role: $ROLE_ARN"
echo ""
echo "Next steps:"
echo "1. Deploy secrets: python scripts/setup_aws_secrets.py"
echo "2. Update config.py to use SecretsClient"
echo "3. Test rotation: aws lambda invoke --function-name $LAMBDA_NAME --payload '{\"service\":\"webhook\"}' /tmp/response.json"
echo "4. Monitor: aws logs tail /aws/lambda/rotate-silxarcrm-credentials --follow"
