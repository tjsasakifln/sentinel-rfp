#!/usr/bin/env bash

# Configure CORS & Lifecycle Rules for Cloudflare R2 Bucket
# Part of issue #205: [R2-26e] Configure CORS & Lifecycle Rules
# https://github.com/tjsasakifln/sentinel-rfp/issues/205

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUCKET_NAME="${CLOUDFLARE_R2_BUCKET:-sentinel-rfp-storage}"
FRONTEND_DOMAIN="${FRONTEND_URL:-http://localhost:3000}"
API_DOMAIN="${API_URL:-http://localhost:4000}"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Cloudflare R2 Bucket Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Bucket:${NC}   $BUCKET_NAME"
echo -e "${BLUE}Frontend:${NC} $FRONTEND_DOMAIN"
echo -e "${BLUE}API:${NC}      $API_DOMAIN"
echo ""

# Function to check if required environment variables are set
check_env_vars() {
    local missing_vars=()

    if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
        missing_vars+=("CLOUDFLARE_ACCOUNT_ID")
    fi

    if [[ -z "${CLOUDFLARE_R2_ACCESS_KEY:-}" ]]; then
        missing_vars+=("CLOUDFLARE_R2_ACCESS_KEY")
    fi

    if [[ -z "${CLOUDFLARE_R2_SECRET_KEY:-}" ]]; then
        missing_vars+=("CLOUDFLARE_R2_SECRET_KEY")
    fi

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        echo -e "${RED}✗ Missing required environment variables:${NC}"
        for var in "${missing_vars[@]}"; do
            echo -e "  - ${var}"
        done
        echo ""
        echo -e "${YELLOW}Please set them in your .env file or export them:${NC}"
        echo -e "  export CLOUDFLARE_ACCOUNT_ID=<your-account-id>"
        echo -e "  export CLOUDFLARE_R2_ACCESS_KEY=<your-access-key>"
        echo -e "  export CLOUDFLARE_R2_SECRET_KEY=<your-secret-key>"
        echo ""
        exit 1
    fi
}

# Function to check if AWS CLI (s3cmd) is installed
check_dependencies() {
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}✗ AWS CLI not found${NC}"
        echo ""
        echo -e "${YELLOW}Please install AWS CLI:${NC}"
        echo -e "  macOS:   brew install awscli"
        echo -e "  Ubuntu:  sudo apt-get install awscli"
        echo -e "  Windows: https://aws.amazon.com/cli/"
        echo ""
        exit 1
    fi

    echo -e "${GREEN}✓ AWS CLI found${NC}"
}

# Function to configure AWS CLI for R2
configure_aws_cli() {
    echo ""
    echo -e "${BLUE}Configuring AWS CLI for R2...${NC}"

    # Set AWS credentials for R2
    export AWS_ACCESS_KEY_ID="${CLOUDFLARE_R2_ACCESS_KEY}"
    export AWS_SECRET_ACCESS_KEY="${CLOUDFLARE_R2_SECRET_KEY}"
    export AWS_ENDPOINT_URL="https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
    export AWS_DEFAULT_REGION="auto"

    echo -e "${GREEN}✓ AWS CLI configured for R2${NC}"
}

# Function to create CORS configuration file
create_cors_config() {
    echo ""
    echo -e "${BLUE}Creating CORS configuration...${NC}"

    cat > /tmp/r2-cors-config.json <<EOF
{
  "CORSRules": [
    {
      "AllowedOrigins": [
        "${FRONTEND_DOMAIN}",
        "${API_DOMAIN}"
      ],
      "AllowedMethods": [
        "GET",
        "PUT",
        "POST",
        "HEAD"
      ],
      "AllowedHeaders": [
        "Content-Type",
        "Content-Disposition",
        "Authorization",
        "x-amz-*",
        "Access-Control-Allow-Origin"
      ],
      "ExposeHeaders": [
        "ETag",
        "Content-Length",
        "Content-Type",
        "Content-Disposition"
      ],
      "MaxAgeSeconds": 3600
    }
  ]
}
EOF

    echo -e "${GREEN}✓ CORS configuration created${NC}"
}

# Function to apply CORS configuration
apply_cors_config() {
    echo ""
    echo -e "${BLUE}Applying CORS configuration to bucket...${NC}"

    if aws s3api put-bucket-cors \
        --bucket "${BUCKET_NAME}" \
        --cors-configuration file:///tmp/r2-cors-config.json \
        --endpoint-url "${AWS_ENDPOINT_URL}"; then
        echo -e "${GREEN}✓ CORS configuration applied successfully${NC}"
    else
        echo -e "${RED}✗ Failed to apply CORS configuration${NC}"
        exit 1
    fi
}

# Function to create lifecycle configuration file
create_lifecycle_config() {
    echo ""
    echo -e "${BLUE}Creating Lifecycle configuration...${NC}"

    cat > /tmp/r2-lifecycle-config.json <<EOF
{
  "Rules": [
    {
      "ID": "expire-temp-files",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "temp/"
      },
      "Expiration": {
        "Days": 7
      }
    },
    {
      "ID": "expire-old-uploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "uploads/"
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 2
      }
    }
  ]
}
EOF

    echo -e "${GREEN}✓ Lifecycle configuration created${NC}"
}

# Function to apply lifecycle configuration
apply_lifecycle_config() {
    echo ""
    echo -e "${BLUE}Applying Lifecycle configuration to bucket...${NC}"

    if aws s3api put-bucket-lifecycle-configuration \
        --bucket "${BUCKET_NAME}" \
        --lifecycle-configuration file:///tmp/r2-lifecycle-config.json \
        --endpoint-url "${AWS_ENDPOINT_URL}"; then
        echo -e "${GREEN}✓ Lifecycle configuration applied successfully${NC}"
    else
        echo -e "${RED}✗ Failed to apply Lifecycle configuration${NC}"
        exit 1
    fi
}

# Function to verify configuration
verify_configuration() {
    echo ""
    echo -e "${BLUE}Verifying configuration...${NC}"

    # Verify CORS
    echo ""
    echo -e "${YELLOW}CORS Configuration:${NC}"
    if aws s3api get-bucket-cors \
        --bucket "${BUCKET_NAME}" \
        --endpoint-url "${AWS_ENDPOINT_URL}"; then
        echo -e "${GREEN}✓ CORS configuration verified${NC}"
    else
        echo -e "${RED}✗ Failed to verify CORS configuration${NC}"
    fi

    # Verify Lifecycle
    echo ""
    echo -e "${YELLOW}Lifecycle Configuration:${NC}"
    if aws s3api get-bucket-lifecycle-configuration \
        --bucket "${BUCKET_NAME}" \
        --endpoint-url "${AWS_ENDPOINT_URL}"; then
        echo -e "${GREEN}✓ Lifecycle configuration verified${NC}"
    else
        echo -e "${RED}✗ Failed to verify Lifecycle configuration${NC}"
    fi
}

# Function to cleanup temporary files
cleanup() {
    echo ""
    echo -e "${BLUE}Cleaning up temporary files...${NC}"
    rm -f /tmp/r2-cors-config.json
    rm -f /tmp/r2-lifecycle-config.json
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Main execution
main() {
    echo ""
    echo -e "${YELLOW}Step 1:${NC} Checking environment variables..."
    check_env_vars

    echo ""
    echo -e "${YELLOW}Step 2:${NC} Checking dependencies..."
    check_dependencies

    echo ""
    echo -e "${YELLOW}Step 3:${NC} Configuring AWS CLI..."
    configure_aws_cli

    echo ""
    echo -e "${YELLOW}Step 4:${NC} Creating CORS configuration..."
    create_cors_config

    echo ""
    echo -e "${YELLOW}Step 5:${NC} Applying CORS configuration..."
    apply_cors_config

    echo ""
    echo -e "${YELLOW}Step 6:${NC} Creating Lifecycle configuration..."
    create_lifecycle_config

    echo ""
    echo -e "${YELLOW}Step 7:${NC} Applying Lifecycle configuration..."
    apply_lifecycle_config

    echo ""
    echo -e "${YELLOW}Step 8:${NC} Verifying configuration..."
    verify_configuration

    echo ""
    echo -e "${YELLOW}Step 9:${NC} Cleanup..."
    cleanup

    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✓ R2 Bucket Configuration Complete!${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}Next Steps:${NC}"
    echo -e "  1. Test presigned URLs from frontend (must use configured domain)"
    echo -e "  2. Verify CORS headers in browser Network tab"
    echo -e "  3. Verify temp files expire after 7 days"
    echo -e "  4. Update documentation with domain configuration"
    echo ""
}

# Run main function
main
