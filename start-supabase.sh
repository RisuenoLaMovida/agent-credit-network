#!/bin/bash
# Easy Supabase Setup for ACN
# Run this after creating your Supabase project

echo "🦞 ACN Supabase Setup Script"
echo "=============================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo ""
    echo "❌ DATABASE_URL not set!"
    echo ""
    echo "To fix:"
    echo "1. Go to Supabase → Project Settings → Database"
    echo "2. Copy the URI connection string"
    echo "3. In Render: Add Environment Variable"
    echo "   Name: DATABASE_URL"
    echo "   Value: [paste your connection string]"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "🔄 Running database setup..."

# Run the schema
psql "$DATABASE_URL" -f backend/supabase-schema.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database setup complete!"
    echo "🚀 Starting ACN server..."
    echo ""
    node backend/server-supabase.js
else
    echo ""
    echo "❌ Database setup failed"
    echo "Check your DATABASE_URL is correct"
    exit 1
fi
