import asyncio
import logging
import sys

from backend.mcp_server import mcp

# Reconfigure logging to write to stderr so stdout is clean for MCP
root = logging.getLogger()
for handler in root.handlers:
    handler.stream = sys.stderr

if __name__ == "__main__":
    asyncio.run(mcp.run_stdio_async())
