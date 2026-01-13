#!/bin/bash
# Generate RSA key pair for JWT signing
# Usage: ./scripts/generate-jwt-keys.sh

set -e

# Create keys directory if it doesn't exist
mkdir -p .keys

# Generate private key (RSA 4096 bits)
openssl genrsa -out .keys/jwt-private.pem 4096

# Extract public key from private key
openssl rsa -in .keys/jwt-private.pem -pubout -out .keys/jwt-public.pem

# Display keys in base64 format for .env
echo ""
echo "✅ RSA keys generated successfully!"
echo ""
echo "Add these to your .env file:"
echo ""
echo "JWT_PRIVATE_KEY=\"$(cat .keys/jwt-private.pem | base64 -w 0)\""
echo ""
echo "JWT_PUBLIC_KEY=\"$(cat .keys/jwt-public.pem | base64 -w 0)\""
echo ""
echo "⚠️  Important: Add .keys/ to your .gitignore"
echo "⚠️  Never commit private keys to version control"
