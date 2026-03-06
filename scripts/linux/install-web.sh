#!/bin/bash

# P-Stream Web Installation Script (Linux)
# This script sets up and runs the P-Stream web application via Docker

set -e

echo "=========================================="
echo "  P-Stream Web Installer (Linux)"
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

# Check if script is run as root
if [ "$EUID" -eq 0 ]; then 
    error "Please do NOT run this script as root. Run as normal user."
    exit 1
fi

# Step 1: Check/Install Docker
echo "Step 1: Checking for Docker..."

# Check if Docker is already running
if docker info &> /dev/null; then
    success "Docker is running!"
else
    info "Docker is not running. Looking for Docker..."
    
    # Check if Docker is installed
    if command -v docker &> /dev/null; then
        info "Docker is installed but not running. Starting Docker..."
        
        # Try to start Docker Desktop
        if command -v docker-desktop &> /dev/null; then
            info "Starting Docker Desktop..."
            docker-desktop &
        elif [ -f "$HOME/.docker/desktop/bin/docker-desktop" ]; then
            info "Starting Docker Desktop..."
            "$HOME/.docker/desktop/bin/docker-desktop" &
        elif [ -f "/usr/bin/docker-desktop" ]; then
            info "Starting Docker Desktop..."
            /usr/bin/docker-desktop &
        else
            # Try systemd
            info "Trying to start Docker service..."
            sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
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
            error "Failed to start Docker. Trying to install..."
        fi
    fi
    
    # If Docker still not running, try to install it
    if ! docker info &> /dev/null; then
        info "Docker not found. Attempting to install..."
        
        # Detect OS and install accordingly
        if [ -f /etc/fedora-release ]; then
            info "Detected Fedora. Installing Docker..."
            sudo dnf install -y docker
            success "Docker installed!"
            
            info "Starting Docker service..."
            sudo systemctl start docker
            sudo systemctl enable docker
        elif [ -f /etc/debian_version ]; then
            info "Detected Debian/Ubuntu. Installing Docker..."
            sudo apt-get update
            sudo apt-get install -y docker.io docker-compose-plugin
            success "Docker installed!"
            
            info "Starting Docker service..."
            sudo systemctl start docker
            sudo systemctl enable docker
        elif [ -f /etc/arch-release ]; then
            info "Detected Arch Linux. Installing Docker..."
            sudo pacman -S --noconfirm docker docker-compose
            success "Docker installed!"
            
            info "Starting Docker service..."
            sudo systemctl start docker
            sudo systemctl enable docker
        elif [ -f /etc/centos-release ] || [ -f /etc/redhat-release ]; then
            info "Detected CentOS/RHEL. Installing Docker..."
            sudo yum install -y docker docker-compose
            success "Docker installed!"
            
            info "Starting Docker service..."
            sudo systemctl start docker
            sudo systemctl enable docker
        else
            # Ask user to install Docker manually
            error "Could not detect your Linux distribution."
            echo ""
            echo "Please install Docker Desktop manually:"
            echo ""
            echo "1. Download Docker Desktop for Linux:"
            echo "   https://www.docker.com/products/docker-desktop/"
            echo ""
            echo "2. Install and start Docker Desktop"
            echo ""
            echo "3. Run this script again"
            echo ""
            wait_for_user
            exit 1
        fi
        
        # Wait for Docker to start after installation
        info "Waiting for Docker to start..."
        for i in {1..30}; do
            if docker info &> /dev/null; then
                success "Docker is now running!"
                break
            fi
            sleep 1
        done
        
        if ! docker info &> /dev/null; then
            error "Failed to start Docker after installation."
            echo ""
            echo "Please start Docker manually and run this script again."
            wait_for_user
            exit 1
        fi
    fi
fi

# Step 2: Check Docker Compose
echo ""
echo "Step 2: Checking Docker Compose..."
if docker compose version &> /dev/null 2>&1; then
    success "Docker Compose is available"
elif docker-compose --version &> /dev/null 2>&1; then
    success "Docker Compose is available"
else
    error "Docker Compose not found. Please install Docker Compose."
    wait_for_user
    exit 1
fi

# Step 3: Build and run containers
echo ""
echo "Step 3: Building and starting P-Stream services..."
echo ""

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Go up two levels: from scripts/linux/ to project root
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"

cd "$PROJECT_DIR"

# Run Docker Compose
if docker compose up --build -d; then
    success "P-Stream services started!"
else
    error "Failed to start P-Stream. Check the error above."
    echo ""
    echo "Try running: docker compose logs"
    wait_for_user
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
