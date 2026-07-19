#!/bin/bash

###############################################################################
# Deploy All 35 Microservices to Google Cloud Run
# Usage: ./deploy-all-services.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGION="asia-south1"
PROJECT_ID="${GOOGLE_CLOUD_PROJECT:-superapp-495816}"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI not found. Please install it first.${NC}"
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to gcloud. Logging in...${NC}"
    gcloud auth login
fi

# Set project
echo -e "${BLUE}📋 Setting project to: $PROJECT_ID${NC}"
gcloud config set project $PROJECT_ID

# Prompt for environment variables
echo ""
echo -e "${YELLOW}🔐 Please provide shared environment variables:${NC}"
echo ""

read -p "MongoDB URI (MONGO_URI): " MONGO_URI
read -p "Redis Host (REDIS_HOST): " REDIS_HOST
read -p "Redis Port (REDIS_PORT) [6379]: " REDIS_PORT
REDIS_PORT=${REDIS_PORT:-6379}
read -sp "Redis Password (REDIS_PASSWORD): " REDIS_PASSWORD
echo ""
read -sp "JWT Secret (min 32 chars): " JWT_SECRET
echo ""

# Validate inputs
if [ -z "$MONGO_URI" ] || [ -z "$JWT_SECRET" ]; then
    echo -e "${RED}❌ MongoDB URI and JWT Secret are required!${NC}"
    exit 1
fi

if [ ${#JWT_SECRET} -lt 32 ]; then
    echo -e "${RED}❌ JWT Secret must be at least 32 characters!${NC}"
    exit 1
fi

# All 35 services
SERVICES=(
    "auth-service:3001"
    "user-service:3002"
    "notification-service:3003"
    "payment-service:3004"
    "file-service:3005"
    "ecommerce-service:3006"
    "vendor-service:3007"
    "inventory-service:3008"
    "shipping-service:3009"
    "recommendation-service:3010"
    "classifieds-service:3011"
    "realestate-service:3012"
    "matrimonial-service:3013"
    "jobs-service:3014"
    "vehicles-service:3015"
    "food-delivery-service:3016"
    "hotel-booking-service:3017"
    "tourism-service:3018"
    "travel-service:3019"
    "business-builder-service:3020"
    "freelancer-service:3021"
    "gulf-services-service:3022"
    "finance-service:3023"
    "insurance-service:3024"
    "healthcare-service:3025"
    "education-service:3026"
    "astrology-service:3027"
    "beauty-ai-service:3028"
    "messaging-service:3029"
    "social-service:3030"
    "diary-service:3031"
    "poll-service:3032"
    "ai-chat-service:3033"
    "kids-video-service:3034"
    "analytics-service:3035"
)

# Deployment summary
TOTAL=${#SERVICES[@]}
SUCCESSFUL=0
FAILED=0
FAILED_SERVICES=()

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deploying 35 Microservices to Cloud Run     ║${NC}"
echo -e "${GREEN}║   Region: $REGION                        ║${NC}"
echo -e "${GREEN}║   Project: $PROJECT_ID              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Create deployment log
LOG_FILE="deployment-$(date +%Y%m%d-%H%M%S).log"
echo "Deployment started at $(date)" > $LOG_FILE
echo "Project: $PROJECT_ID" >> $LOG_FILE
echo "Region: $REGION" >> $LOG_FILE
echo "" >> $LOG_FILE

# Deploy each service
for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    
    CURRENT=$((SUCCESSFUL + FAILED + 1))
    
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}[$CURRENT/$TOTAL] Deploying: $service_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    SERVICE_PATH="microservices/$service_name"
    
    # Check if service directory exists
    if [ ! -d "$SERVICE_PATH" ]; then
        echo -e "${RED}❌ Service directory not found: $SERVICE_PATH${NC}"
        FAILED=$((FAILED + 1))
        FAILED_SERVICES+=("$service_name")
        echo "FAILED: $service_name (directory not found)" >> $LOG_FILE
        continue
    fi
    
    # Navigate to service directory
    cd "$SERVICE_PATH"
    
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    if npm install --production &>> ../../$LOG_FILE; then
        echo -e "${GREEN}✅ Dependencies installed${NC}"
    else
        echo -e "${YELLOW}⚠️  Warning: npm install had issues, continuing...${NC}"
    fi
    
    echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"
    
    # Deploy with gcloud
    if gcloud run deploy "$service_name" \
        --source . \
        --region "$REGION" \
        --platform managed \
        --allow-unauthenticated \
        --port "$port" \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 10 \
        --timeout 300 \
        --set-env-vars "NODE_ENV=production,PORT=$port,SERVICE_NAME=$service_name,MONGO_URI=$MONGO_URI,REDIS_HOST=$REDIS_HOST,REDIS_PORT=$REDIS_PORT,REDIS_PASSWORD=$REDIS_PASSWORD,JWT_SECRET=$JWT_SECRET,LOG_LEVEL=info" \
        --quiet \
        2>> ../../$LOG_FILE; then
        
        # Get service URL
        SERVICE_URL=$(gcloud run services describe "$service_name" --region "$REGION" --format="value(status.url)" 2>/dev/null)
        
        echo -e "${GREEN}✅ Deployed successfully!${NC}"
        echo -e "${GREEN}   URL: $SERVICE_URL${NC}"
        
        # Test health endpoint
        echo -e "${YELLOW}🏥 Testing health endpoint...${NC}"
        if curl -s -f -m 10 "$SERVICE_URL/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Health check passed${NC}"
        else
            echo -e "${YELLOW}⚠️  Health check failed (service may still be starting)${NC}"
        fi
        
        SUCCESSFUL=$((SUCCESSFUL + 1))
        echo "SUCCESS: $service_name -> $SERVICE_URL" >> ../../$LOG_FILE
    else
        echo -e "${RED}❌ Deployment failed!${NC}"
        FAILED=$((FAILED + 1))
        FAILED_SERVICES+=("$service_name")
        echo "FAILED: $service_name" >> ../../$LOG_FILE
    fi
    
    # Return to root directory
    cd ../..
    
    # Small delay to avoid rate limiting
    sleep 2
done

# Final summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Deployment Complete!                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo -e "   ${GREEN}✅ Successful: $SUCCESSFUL${NC}"
echo -e "   ${RED}❌ Failed: $FAILED${NC}"
echo -e "   📝 Total: $TOTAL"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Failed services:${NC}"
    for failed in "${FAILED_SERVICES[@]}"; do
        echo -e "   • $failed"
    done
    echo ""
    echo -e "${YELLOW}💡 Check the log file for details: $LOG_FILE${NC}"
    echo ""
fi

# List all service URLs
echo -e "${BLUE}📋 Service URLs:${NC}"
echo ""

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    
    SERVICE_URL=$(gcloud run services describe "$service_name" --region "$REGION" --format="value(status.url)" 2>/dev/null || echo "Not deployed")
    
    if [ "$SERVICE_URL" != "Not deployed" ]; then
        echo -e "${GREEN}✅ $service_name${NC}"
        echo -e "   $SERVICE_URL"
    else
        echo -e "${RED}❌ $service_name - Not deployed${NC}"
    fi
done

echo ""
echo -e "${YELLOW}📝 Full deployment log saved to: $LOG_FILE${NC}"
echo ""

# Generate API Gateway configuration
echo -e "${BLUE}🔧 Generating API Gateway configuration...${NC}"

cat > api-gateway-config.yaml << EOF
# API Gateway Configuration for Kong
# Generated: $(date)

services:
EOF

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port <<< "$service_info"
    SERVICE_URL=$(gcloud run services describe "$service_name" --region "$REGION" --format="value(status.url)" 2>/dev/null || echo "")
    
    if [ -n "$SERVICE_URL" ]; then
        # Extract route path from service name
        route_path=$(echo $service_name | sed 's/-service$//' | sed 's/-//')
        
        cat >> api-gateway-config.yaml << EOF
  - name: $service_name
    url: $SERVICE_URL
    routes:
      - name: ${service_name}-routes
        paths:
          - /api/$route_path
        strip_path: true
    plugins:
      - name: rate-limiting
        config:
          minute: 100
          policy: local
EOF

        if [ "$service_name" != "auth-service" ]; then
            cat >> api-gateway-config.yaml << EOF
      - name: jwt
        config:
          secret_is_base64: false
EOF
        fi
        
        cat >> api-gateway-config.yaml << EOF

EOF
    fi
done

echo -e "${GREEN}✅ API Gateway config saved to: api-gateway-config.yaml${NC}"
echo ""

# Next steps
echo -e "${YELLOW}╔════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║              Next Steps                        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo "1. Set up API Gateway:"
echo "   • Install Kong or Nginx"
echo "   • Use api-gateway-config.yaml"
echo ""
echo "2. Update frontend environment:"
echo "   • REACT_APP_API_URL=https://your-api-gateway.com"
echo ""
echo "3. Monitor services:"
echo "   • Google Cloud Console > Cloud Run"
echo "   • Check logs and metrics"
echo ""
echo "4. Test services:"
echo "   • Test health endpoints"
echo "   • Test API endpoints"
echo ""

if [ $SUCCESSFUL -eq $TOTAL ]; then
    echo -e "${GREEN}🎉 All services deployed successfully! Your microservices are live!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some services failed to deploy. Check the log file and retry failed services.${NC}"
    exit 1
fi
