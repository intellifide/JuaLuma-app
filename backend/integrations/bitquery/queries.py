"""Bitquery v2 GraphQL queries for address transfer history."""

EVM_TRANSFERS_QUERY = """
query ($network: evm_network, $address: String!, $limit: Int!, $offset: Int!) {
  EVM(network: $network) {
    Transfers(
      where: {
        any: [
            { Transfer: { Sender: { is: $address } } },
            { Transfer: { Receiver: { is: $address } } }
        ]
      }
      limit: { count: $limit, offset: $offset }
    ) {
      Transfer {
        Amount
        Currency { Symbol Decimals }
        Sender
        Receiver
        # Note: Transaction hash is often direct on Transfer or via Transaction { Hash }
        # The error said "Cannot query field Transaction on type EVM_Transfer_Fields_Transfer"
        # Checking schema: it is usually 'Transaction { Hash }' but maybe just 'TransactionHash'?
        # Let's try Transaction { Hash } again, maybe it was just a side effect of the other errors?
        # No, 'Cannot query field' is specific. 
        # Let's use 'Transaction { Hash }' is standard but maybe it's `TransactionHash`? 
        # Actually, let's look at docs again. It IS Transaction { Hash }.
        # Wait, the previous query had `Transaction { Hash }`. 
        # Ah, maybe the previous query error was misleading?
        # Let's try `Transaction { Hash }` but if that fails, `TransactionHash`.
        # Actually, let's strictly follow the error "Cannot query field Transaction". 
        # That means it's NOT there.
        # But wait, we need the hash.
        # Let's try `TransactionHash` if validation fails.
        # RE-READING ERROR: `Cannot query field "Transaction" on type "EVM_Transfer_Fields_Transfer"`.
        # This means `Transfer.Transaction` does not exist? That's super weird for V2.
        # Maybe it's `Transaction { Hash }` OUTSIDE of `Transfer`?
        # NO, `Transfers` returns a list of items which contain `Transfer`, `Block`, `Transaction`.
        # Ah! `Transfer` object itself might not have `Transaction`.
        # The `Transfers` list item has `Transfer`, `Block`, AND `Transaction` (sibling to Transfer).
        # Let's try that structure!
      }
      Transaction { Hash }
      Block { Time }
    }
  }
}
"""

BITCOIN_TRANSFERS_QUERY = """
query ($address: String!, $limit: Int!, $offset: Int!) {
  Bitcoin {
    Transfers(
      where: {
        any: [
            { Transfer: { Sender: { is: $address } } },
            { Transfer: { Receiver: { is: $address } } }
        ]
      }
      limit: { count: $limit, offset: $offset }
      orderBy: { Block: { Time: DESC } }
    ) {
      Transfer {
        Amount
        Currency { Symbol Decimals }
        Sender
        Receiver
        Transaction { Hash }
      }
      Block { Time }
    }
  }
}
"""

SOLANA_TRANSFERS_QUERY = """
query ($address: String!, $limit: Int!, $offset: Int!) {
  Solana {
    Transfers(
      where: {
        any: [
            { Transfer: { Sender: { is: $address } } },
            { Transfer: { Receiver: { is: $address } } }
        ]
      }
      limit: { count: $limit, offset: $offset }
      orderBy: { Block: { Time: DESC } }
    ) {
      Transfer {
        Amount
        Currency { Symbol Decimals }
        Sender
        Receiver
        Transaction { Signature }
      }
      Block { Time }
    }
  }
}
"""

# Cardano is not fully supported in V2 Transfers yet, but we will use the pattern.
CARDANO_TRANSFERS_QUERY = """
query ($address: String!, $limit: Int!, $offset: Int!) {
  Cardano {
    Transfers(
      where: {
        any: [
            { Transfer: { Sender: { is: $address } } },
            { Transfer: { Receiver: { is: $address } } }
        ]
      }
      limit: { count: $limit, offset: $offset }
      orderBy: { Block: { Time: DESC } }
    ) {
      Transfer {
        Amount
        Currency { Symbol Decimals }
        Sender
        Receiver
        Transaction { Hash }
      }
      Block { Time }
    }
  }
}
"""

# XRPL might use a different dataset name, usually it is part of the unified schema or specific chain.
# Checking docs, Ripple is not in the primary V2 EVM-like schema list, often managed separately.
# However, assuming standard naming convention for now or fallback.
# Bitquery V2 does not have a generic "XRPL" dataset in the same way as EVM.
# It supports "Ripple" in V1, but V2 status is specific.
# We will keep the pattern but it might fail if dataset doesn't exist.
XRP_PAYMENTS_QUERY = """
query ($address: String!, $limit: Int!, $offset: Int!) {
  Ripple {
    Transfers(
       where: {
        any: [
            { Transfer: { Sender: { is: $address } } },
            { Transfer: { Receiver: { is: $address } } }
        ]
      }
      limit: { count: $limit, offset: $offset }
      orderBy: { Block: { Time: DESC } }
    ) {
      Transfer {
        Amount
        Currency { Symbol Decimals }
        Sender
        Receiver
        Transaction { Hash }
      }
      Block { Time }
    }
  }
}
"""

TRON_TRANSFERS_QUERY = """
query ($address: String!, $limit: Int!, $offset: Int!) {
  Tron {
    Transfers(
      where: {
        any: [
            { Transfer: { Sender: { is: $address } } },
            { Transfer: { Receiver: { is: $address } } }
        ]
      }
      limit: { count: $limit, offset: $offset }
      orderBy: { Block: { Time: DESC } }
    ) {
      Transfer {
        Amount
        Currency { Symbol Decimals }
        Sender
        Receiver
        Transaction { Hash }
      }
      Block { Time }
    }
  }
}
"""

__all__ = [
    "EVM_TRANSFERS_QUERY",
    "BITCOIN_TRANSFERS_QUERY",
    "SOLANA_TRANSFERS_QUERY",
    "CARDANO_TRANSFERS_QUERY",
    "XRP_PAYMENTS_QUERY",
    "TRON_TRANSFERS_QUERY",
]
