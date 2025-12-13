import asyncio
import sys
import logging
from backend.dev_tools.mcp_server import dev_mcp

# Reconfigure logging to write to stderr
root = logging.getLogger()
for handler in root.handlers:
    handler.stream = sys.stderr

if __name__ == "__main__":
    asyncio.run(dev_mcp.run_stdio_async())
