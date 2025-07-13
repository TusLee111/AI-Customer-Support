from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv
import logging

from database.connection import init_db, close_db
from routes import auth, chat, admin, analytics, ai
from socketio_instance import init_app as init_socketio
from routes.public import public_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await init_db()
    logger.info("🚀 Backend started successfully!")
    yield
    # Shutdown
    await close_db()
    logger.info("👋 Backend shutdown complete!")

app = FastAPI(
    title="AI Customer Support System",
    description="Real-time customer support with AI-powered intent classification and response generation",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware MUST be added BEFORE mounting Socket.IO
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tạm thời cho phép mọi origin để test CORS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
print('[CORS] CORS middleware configured: allow_origins=*')

# Mount Socket.IO after CORS middleware
init_socketio(app)

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    messages = [err['msg'] for err in errors]
    return JSONResponse(
        status_code=400,
        content={"detail": messages}
    )

# Include public_router trước
app.include_router(public_router, tags=["Public"])
# Sau đó mới include các router khác
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "AI Customer Support System API",
        "version": "1.0.0",
        "status": "running"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)