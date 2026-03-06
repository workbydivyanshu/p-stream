#!/bin/bash

# P-Stream Desktop App Installation Script (Linux)
# This script builds and runs the P-Stream Electron desktop application

set -e

echo "=========================================="
echo "  P-Stream Desktop App Installer (Linux)"
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

# Step 1: Check Node.js
echo "Step 1: Checking for Node.js..."
if command -v node &> /dev/null; then
    success "Node.js is installed ($(node --version))"
else
    error "Node.js is not installed. Please install Node.js first:"
    echo "  https://nodejs.org/"
    exit 1
fi

# Step 2: Install pnpm
echo ""
echo "Step 2: Installing pnpm..."
if command -v pnpm &> /dev/null; then
    success "pnpm is already installed"
else
    info "Installing pnpm globally..."
    
    # Try npm first
    if command -v npm &> /dev/null; then
        npm install -g pnpm
        if [ $? -eq 0 ]; then
            success "pnpm installed via npm"
        else
            error "Failed to install pnpm via npm"
            exit 1
        fi
    # Try corepack
    elif command -v corepack &> /dev/null; then
        corepack enable
        corepack prepare pnpm@latest --activate
        success "pnpm installed via corepack"
    else
        error "Could not install pnpm. Please install it manually: npm install -g pnpm"
        exit 1
    fi
fi

# Step 3: Navigate to desktop folder
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Go up two levels: from scripts/linux/ to project root
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
DESKTOP_DIR="$PROJECT_DIR/p-stream-desktop"

echo ""
echo "Step 3: Navigating to P-Stream Desktop folder..."

if [ ! -d "$DESKTOP_DIR" ]; then
    error "p-stream-desktop folder not found at $DESKTOP_DIR"
    exit 1
fi

cd "$DESKTOP_DIR"
success "Changed directory to p-stream-desktop"

# Step 4: Install dependencies
echo ""
echo "Step 4: Installing dependencies..."
echo ""

if pnpm install; then
    success "Dependencies installed"
else
    error "Failed to install dependencies"
    exit 1
fi

# Step 5: Build the app
echo ""
echo "Step 5: Building P-Stream Desktop app..."
echo ""

if pnpm run build; then
    success "App built successfully!"
else
    error "Failed to build the app"
    exit 1
fi

# Step 6: Run the app
echo ""
echo "Step 6: Launching P-Stream Desktop app..."
echo ""

success "Starting P-Stream Desktop app..."
pnpm start

# If we get here, the app was closed
echo ""
success "P-Stream Desktop app closed."
