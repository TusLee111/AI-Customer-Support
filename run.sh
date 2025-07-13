#!/bin/bash

echo "🚀 Starting AI Customer Support System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if MongoDB is running
check_mongodb() {
    if ! pgrep -x "mongod" > /dev/null; then
        print_warning "MongoDB is not running. Starting MongoDB..."
        if command -v mongod &> /dev/null; then
            mongod --fork --logpath /tmp/mongod.log
            sleep 2
        else
            print_error "MongoDB is not installed. Please install MongoDB first."
            print_warning "You can run: docker run -d -p 27017:27017 --name mongodb mongo:6.0"
            exit 1
        fi
    else
        print_status "MongoDB is already running"
    fi
}

# Start backend
start_backend() {
    print_status "Starting backend server..."
    cd backend
    
    # Check if virtual environment exists
    if [ ! -d "venv" ]; then
        print_status "Creating virtual environment..."
        python3 -m venv venv
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    pip install -r requirements.txt
    
    # Start backend
    print_status "Starting FastAPI server..."
    python -m uvicorn app:socket_app --reload --host 0.0.0.0 --port 8000 &
    BACKEND_PID=$!
    cd ..
    
    print_status "Backend started with PID: $BACKEND_PID"
}

# Start admin frontend
start_admin_frontend() {
    print_status "Starting admin frontend..."
    cd frontend/admin
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing admin frontend dependencies..."
        npm install
    fi
    
    # Start admin frontend
    print_status "Starting admin React app..."
    npm start &
    ADMIN_PID=$!
    cd ../..
    
    print_status "Admin frontend started with PID: $ADMIN_PID"
}

# Start customer frontend
start_customer_frontend() {
    print_status "Starting customer frontend..."
    cd frontend/customer
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing customer frontend dependencies..."
        npm install
    fi
    
    # Start customer frontend
    print_status "Starting customer React app..."
    PORT=3001 npm start &
    CUSTOMER_PID=$!
    cd ../..
    
    print_status "Customer frontend started with PID: $CUSTOMER_PID"
}

# Function to cleanup on exit
cleanup() {
    print_status "Shutting down services..."
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$ADMIN_PID" ]; then
        kill $ADMIN_PID 2>/dev/null
    fi
    if [ ! -z "$CUSTOMER_PID" ]; then
        kill $CUSTOMER_PID 2>/dev/null
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    print_status "Checking prerequisites..."
    
    # Check if Python is installed
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 is not installed. Please install Python 3.8+ first."
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 16+ first."
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check MongoDB
    check_mongodb
    
    # Start services
    start_backend
    sleep 3  # Wait for backend to start
    
    start_admin_frontend
    sleep 2
    
    start_customer_frontend
    
    print_status "🎉 All services started successfully!"
    echo ""
    echo "Access URLs:"
    echo "- Admin Interface: http://localhost:3000"
    echo "- Customer Interface: http://localhost:3001"
    echo "- API Documentation: http://localhost:8000/docs"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for user to stop
    wait
}

# Run main function
main 