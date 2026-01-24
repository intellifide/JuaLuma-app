#!/usr/bin/env python3
"""Test script to diagnose Coinbase connection issue"""
import json
import sys
sys.path.insert(0, '/app')

# Simulate what frontend sends (with literal \n escape sequences)
api_key = 'organizations/ad2cbe0c-372a-4cb0-b666-d15192e8bcc8/apiKeys/b90720d0-d2ab-4ee6-8c09-4921683fe75a'
api_secret = '-----BEGIN EC PRIVATE KEY-----\\nMHcCAQEEIMtVRMRVsCIv8CvaWNhThYxXA3YDFedpVDQJ95lT9TwZoAoGCCqGSM49\\nAwEHoUQDQgAEIiOKa31SL57VsejSeZHxaGK34JKdaVEIoqwpbLM0HH3N4eklspPv\\nws5fn4K3m2Q/0QkVGwIxRSIjPZu32/ndDA==\\n-----END EC PRIVATE KEY-----\\n'

payload = {
    'exchange_id': 'coinbase',
    'api_key': api_key,
    'api_secret': api_secret,
    'account_name': 'Test Coinbase Account'
}

# Convert to JSON (like frontend does)
json_str = json.dumps(payload)
print('=== JSON Payload (first 250 chars) ===')
print(json_str[:250])
print()

# Parse back (like backend does)
parsed = json.loads(json_str)
backslash_n = '\\n'
has_literal = backslash_n in parsed['api_secret']
has_newline = '\n' in parsed['api_secret'].replace(backslash_n, '')

print('=== After JSON.parse ===')
print(f'  api_key: {parsed["api_key"][:50]}...')
print(f'  api_secret starts with: {repr(parsed["api_secret"][:50])}')
print(f'  Has literal backslash-n: {has_literal}')
print(f'  Has actual newlines: {has_newline}')
print()

# Test normalization (like backend does)
normalized = parsed['api_secret'].replace('\\n', '\n')
print('=== After normalization ===')
print(f'  Starts with: {repr(normalized[:50])}')
print(f'  Has actual newlines: {\n in normalized}')
print()

# Test with CCXT
import ccxt
try:
    print('=== Testing CCXT ===')
    exchange = ccxt.coinbaseadvanced({
        'apiKey': parsed['api_key'],
        'secret': normalized,
        'enableRateLimit': True,
    })
    print('✓ Exchange created successfully')
    
    exchange.load_markets()
    print('✓ Markets loaded successfully')
    
    trades = exchange.fetch_my_trades(limit=5)
    print(f'✓ Successfully fetched {len(trades)} trades')
    print('\n=== SUCCESS: Connection works! ===')
except Exception as e:
    print(f'✗ CCXT Error: {type(e).__name__}: {e}')
    import traceback
    traceback.print_exc()
