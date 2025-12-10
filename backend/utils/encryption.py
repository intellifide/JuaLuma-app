
import os
import base64
import logging

# Check if cryptography is available
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
    HAS_CRYPTO = True
except ImportError:
    Fernet = None # type: ignore
    HAS_CRYPTO = False

logger = logging.getLogger(__name__)

# In a real production scenario with Cloud KMS, we would import the KMS client here.
# For this implementation, we focus on the Local interface and structure.

def _get_local_key(user_dek_ref: str) -> bytes:
    """
    Derives a localized encryption key from the service's master key and the user's reference.
    This simulates a per-user key retrieval.
    """
    master_key = os.getenv("LOCAL_ENCRYPTION_KEY", "CHANGE_ME_IN_PROD_OR_USE_KMS_PLEASE_12345")
    
    # Derive a key using PBKDF2
    salt = b'finity_local_salt' # In prod, store salt per user
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    # Combine master and user ref
    key_material = f"{master_key}:{user_dek_ref}".encode()
    return base64.urlsafe_b64encode(kdf.derive(key_material))

def encrypt_prompt(text: str, user_dek_ref: str) -> str:
    """
    Encrypts the prompt text.
    
    Args:
        text: The raw prompt text.
        user_dek_ref: A reference ID for the user's key (e.g., user_id or a KMS key resource ID).
        
    Returns:
        The encrypted text as a string (base64 encoded).
    """
    env = os.getenv("App_Env", "local").lower()
    
    if env == "production":
        # Placeholder for Cloud KMS implementation
        # client = kms.KeyManagementServiceClient()
        # ... logic to encrypt using user_dek_ref as key name ...
        # For now fallback to local simulation or raise NotImplemented
        logger.warning("Cloud KMS not fully implemented in this logic, using local simulation.")
        pass

    if not HAS_CRYPTO:
        raise ImportError("Cryptography package is required for encryption.")

    key = _get_local_key(user_dek_ref)
    f = Fernet(key)
    return f.encrypt(text.encode()).decode()

def decrypt_prompt(encrypted_text: str, user_dek_ref: str) -> str:
    """
    Decrypts the prompt text.
    """
    _ = os.getenv("App_Env", "local").lower()
    
    if not HAS_CRYPTO:
        raise ImportError("Cryptography package is required for encryption.")

    try:
        key = _get_local_key(user_dek_ref)
        f = Fernet(key)
        return f.decrypt(encrypted_text.encode()).decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        raise ValueError("Failed to decrypt prompt.") from e
