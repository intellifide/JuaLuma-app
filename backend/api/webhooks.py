# Updated 2025-12-19 02:40 CST
import logging
from fastapi import APIRouter, Header, Request, Depends
from sqlalchemy.orm import Session

from backend.utils import get_db
from backend.services.billing import handle_stripe_webhook

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(request: Request, stripe_signature: str = Header(None), db: Session = Depends(get_db)):
    """
    Stripe webhook endpoint.
    Delegates event construction and handling to the billing service.
    """
    # Read the raw body as bytes
    payload = await request.body()
    
    # Delegate to service
    # This will raise HTTP exceptions on failure, which is what we want.
    return await handle_stripe_webhook(payload, stripe_signature, db)

