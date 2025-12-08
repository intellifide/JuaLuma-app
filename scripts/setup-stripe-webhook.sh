#!/bin/bash
# Stripe Webhook Listener Setup Script
# This script sets up the Stripe webhook listener for local development

echo "Setting up Stripe webhook listener..."
echo ""
echo "Prerequisites:"
echo "1. Stripe CLI must be installed (check with: which stripe)"
echo "2. You must be logged in to Stripe CLI (run: stripe login)"
echo "3. Your FastAPI backend must be running on port 8001"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI is not installed."
    echo "Install it from: https://stripe.com/docs/stripe-cli"
    exit 1
fi

# Check if user is logged in
if ! stripe config --list &> /dev/null; then
    echo "⚠️  You need to log in to Stripe CLI first."
    echo "Run: stripe login"
    echo "Then run this script again."
    exit 1
fi

echo "✅ Stripe CLI is installed and configured"
echo ""
echo "Starting Stripe webhook listener..."
echo "This will forward webhook events to: http://localhost:4242/webhook"
echo "Press Ctrl+C to stop the listener"
echo ""

# Start the webhook listener
stripe listen --forward-to localhost:4242/webhook
