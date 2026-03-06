#!/bin/bash

# P-Stream Web Installation Script (Mac)
# This script sets up and runs the P-Stream web application via Docker

set -e

echo "=========================================="
echo "  P-Stream Web Installer (Mac)"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print success
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info
info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to wait for user input
wait_for_user() {
    echo ""
    read -p "Press Enter to continue..."
}

# Step 1: Check if Docker is installed
echo "Step 1: Checking for Docker..."

# Check if Docker is running
if docker info &> /dev/null; then
    success "Docker is running!"
else
    # Check if Docker is installed
    if command -v docker &> /dev/null; then
        info "Docker is installed but not running. Starting Docker Desktop..."
        open -a Docker 2>/dev/null || true
    else
        info "Docker not found. Attempting to install..."
        
        # Check if Homebrew is installed
        if command -v brew &> /dev/null; then
            info "Installing Docker via Homebrew..."
            brew install --cask docker
            success "Docker installed!"
            
            info "Starting Docker Desktop..."
            open -a Docker
        else
            error "Could not install Docker automatically."
            echo ""
            echo "Please install Docker Desktop manually:"
            echo "  1. Download: https://www.docker.com/products/docker-desktop/"
            echo "  2. Install and start Docker Desktop"
            echo "  3. Run this script again"
            echo ""
            wait_for_user
            exit 1
        fi
    fi
    
    # Wait for Docker to start
    info "Waiting for Docker to start..."
    for i in {1..60}; do
        if docker info &> /dev/null; then
            success "Docker is now running!"
            break
        fi
        sleep 1
    done
    
    if ! docker info &> /dev/null; then
        error "Failed to start Docker. Please start Docker Desktop manually."
        exit 1
    fi
fi

# Step 2: Check Docker Compose
echo ""
echo "Step 2: Checking Docker Compose..."
if docker compose version &> /dev/null 2>&1; then
    success "Docker Compose is available"
else
    error "Docker Compose not found. Please update Docker Desktop."
    exit 1
fi

# Step 3: Build and run containers
echo ""
echo "Step 3: Building and starting P-Stream services..."
echo ""

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Go up two levels: from scripts/mac/ to project root
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_DIR"

# Run Docker Compose
if docker compose up --build -d; then
    success "P-Stream services started!"
else
    error "Failed to start P-Stream. Check the error above."
    exit 1
fi

# Step 4: Wait for services to be ready
echo ""
echo "Step 4: Waiting for services to be ready..."
sleep 8

# Step 5: Show status
echo ""
echo "=========================================="
echo "  P-Stream is Ready!"
echo "=========================================="
echo ""
echo "🌐  Web App:        http://localhost"
echo "🔧  Backend API:    http://localhost:3001"
echo "🔄  Proxy:          http://localhost:3000"
echo "💾  Database:       localhost:5432"
echo ""
echo "To stop: docker compose down"
echo "To view logs: docker compose logs -f"
echo ""
success "Enjoy P-Stream!"
