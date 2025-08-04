from server import app  # Import your FastAPI app
from vercel_python import asgi_adapter

# Handler for Vercel serverless function
handler = asgi_adapter(app)
