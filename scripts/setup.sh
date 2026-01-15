#!/bin/bash

# Setup script for IMMOMALI Backend

echo "🚀 Setting up IMMOMALI Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create database (optional - requires PostgreSQL CLI)
read -p "Do you want to create the database? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🗄️  Creating database..."
    createdb immomali || echo "Database might already exist"
fi

# Build the project
echo "🔨 Building the project..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env file with the correct database credentials"
echo "2. Run migrations: npm run migration:run"
echo "3. Start the development server: npm run start:dev"
echo ""
echo "📚 API Documentation will be available at: http://localhost:3000/api/docs"
