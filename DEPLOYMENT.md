# Deployment Guide: Vacation Planner

## Architecture

```
┌─────────────────────┐         ┌──────────────────────────────┐
│   React Frontend    │  REST   │   FastAPI Backend             │
│   (S3 + CloudFront) │◄───────►│   (Bedrock AgentCore / ECS)  │
│   or Amplify        │  API    │   + CrewAI + Bedrock Nova Pro │
└─────────────────────┘         └──────────────────────────────┘
```

---

## Backend Deployment (AWS Bedrock AgentCore)

### Option 1: Bedrock AgentCore (Recommended)

1. **Package as container**:
   ```bash
   cd vacation-planner
   docker build -f backend/Dockerfile -t vacation-planner-api .
   ```

2. **Push to ECR**:
   ```bash
   aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com
   docker tag vacation-planner-api:latest <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/vacation-planner-api:latest
   docker push <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com/vacation-planner-api:latest
   ```

3. **Deploy on AgentCore**: Use the Bedrock AgentCore console or CLI to create a new runtime with:
   - Container image: your ECR URI
   - Environment variables:
     - `SERPER_API_KEY` = your Serper key
     - `ALLOWED_ORIGINS` = your frontend URL (e.g., `https://your-app.cloudfront.net`)
   - IAM role with `bedrock:InvokeModel` permission for `us.amazon.nova-pro-v1:0`

### Option 2: ECS Fargate

```bash
# Create cluster
aws ecs create-cluster --cluster-name vacation-planner

# Create task definition (see backend/task-definition.json)
aws ecs register-task-definition --cli-input-json file://backend/task-definition.json

# Create service with ALB
aws ecs create-service \
  --cluster vacation-planner \
  --service-name vacation-planner-api \
  --task-definition vacation-planner-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Environment Variables (Backend)

| Variable | Description |
|----------|-------------|
| `SERPER_API_KEY` | SerperDev API key for web search |
| `ALLOWED_ORIGINS` | Comma-separated frontend URLs for CORS |
| `AWS_DEFAULT_REGION` | AWS region (default: us-west-2) |

---

## Frontend Deployment (React)

### Option 1: AWS Amplify (Easiest)

1. Push `frontend/` to a Git repo
2. Go to AWS Amplify Console → New App → Connect Git
3. Set build settings:
   - Build command: `npm run build`
   - Output directory: `build`
   - Environment variable: `REACT_APP_API_URL=https://your-api-url.com`
4. Deploy

### Option 2: S3 + CloudFront

```bash
cd frontend

# Build with your API URL
REACT_APP_API_URL=https://your-api-endpoint.com npm run build

# Sync to S3
aws s3 sync build/ s3://your-frontend-bucket/ --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id EXXXXX --paths "/*"
```

### Option 3: Docker (for ECS/Fargate)

```bash
cd frontend
docker build --build-arg REACT_APP_API_URL=https://your-api-endpoint.com -t vacation-planner-frontend .
```

---

## Local Development

### Backend
```bash
cd vacation-planner
pip install -e ".[dev]"
uvicorn backend.app:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:8000 npm start
```

Opens at http://localhost:3000

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/cities` | List all supported cities |
| POST | `/plan` | Run AI vacation planner |

### POST /plan Request Body
```json
{
  "source_city": "Mumbai",
  "destination": "Paris",
  "number_of_days": 5
}
```

### POST /plan Response
```json
{
  "destination": "Paris",
  "source_city": "Mumbai",
  "number_of_days": 5,
  "report": "## Paris Overview...",
  "weather": "## Weather...",
  "itinerary": "## Day 1...",
  "hotels": "| Hotel Name | ...",
  "restaurants": "| Restaurant Name | ...",
  "activities": "## Activities..."
}
```
