import os
import httpx
import json
import logging
from typing import Optional, Dict, Any, Tuple
from fastapi import HTTPException
from web3 import Web3
from eth_account import Account

logger = logging.getLogger(__name__)

# Strictly USDT/USD focused configurations
NETWORK_CONFIGS = {
    "bep20": {
        "name": "Binance Smart Chain",
        "chain_id": 56,
        "rpc_url": os.getenv("BSC_RPC_URL", "https://bsc-dataseed.binance.org/"),
        "token_address": os.getenv("USDT_BSC_ADDRESS", "0x55d398326f99059fF775485246999027B3197955"),
        "decimals": 18,
        "gas_limit": 80000, 
        "gas_price_multiplier": 1.1 
    },
    "erc20": {
        "name": "Ethereum",
        "chain_id": 1,
        "rpc_url": os.getenv("ETH_RPC_URL"),
        "token_address": os.getenv("USDT_ETH_ADDRESS", "0xdAC17F958D2ee523a2206206994597C13D831ec7"),
        "decimals": 6, # USDT on ETH is 6 decimals
        "gas_limit": 100000,
        "gas_price_multiplier": 1.15
    },
    "trc20": {
        "name": "Tron",
        "api_url": os.getenv("TRON_API_URL", "https://api.trongrid.io"),
        "token_address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        "decimals": 6,
        "fee_limit": 100_000_000  # 100 TRX in SUN
    }
}

# --- 1. EVM HANDLER (BSC/ETH) ---

class EVMWithdrawal:
    def __init__(self, network: str):
        self.config = NETWORK_CONFIGS.get(network)
        self.w3 = Web3(Web3.HTTPProvider(self.config["rpc_url"]))
        self.wallet_address = os.getenv("HOT_WALLET_ADDRESS")
        self.private_key = os.getenv("HOT_WALLET_PRIVATE_KEY")
        
        # ERC-20 Standard ABI
        self.abi = [
            {"constant": False, "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}], "name": "transfer", "outputs": [{"name": "", "type": "bool"}], "type": "function"},
            {"constant": True, "inputs": [{"name": "_owner", "type": "address"}], "name": "balanceOf", "outputs": [{"name": "balance", "type": "uint256"}], "type": "function"}
        ]

    async def process(self, to_address: str, amount_usd: float) -> str:
        token_address = Web3.to_checksum_address(self.config["token_address"])
        contract = self.w3.eth.contract(address=token_address, abi=self.abi)
        
        # Convert USD to base units based on specific chain decimals
        amount_base = int(amount_usd * (10 ** self.config["decimals"]))
        
        # Build Transaction
        nonce = self.w3.eth.get_transaction_count(self.wallet_address)
        tx = contract.functions.transfer(
            Web3.to_checksum_address(to_address), 
            amount_base
        ).build_transaction({
            'chainId': self.config["chain_id"],
            'gas': self.config["gas_limit"],
            'gasPrice': int(self.w3.eth.gas_price * self.config["gas_price_multiplier"]),
            'nonce': nonce,
        })

        signed_tx = self.w3.eth.account.sign_transaction(tx, self.private_key)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        return tx_hash.hex()

# --- 2. TRON HANDLER (TRC-20) ---

class TRC20Withdrawal:
    def __init__(self):
        self.config = NETWORK_CONFIGS["trc20"]
        self.api_key = os.getenv("TRONGRID_API_KEY")
        self.private_key = os.getenv("TRON_HOT_WALLET_PRIVATE_KEY")
        self.owner_address = os.getenv("TRON_HOT_WALLET_ADDRESS")

    async def process(self, to_address: str, amount_usd: float) -> str:
        # TronGrid TriggerSmartContract for TRC20 Transfer
        url = f"{self.config['api_url']}/wallet/triggersmartcontract"
        amount_sun = int(amount_usd * (10 ** self.config["decimals"]))
        
        # Format the parameters for the transfer(address,uint256) function
        # Address must be 32 bytes (64 chars) padded with zeros
        dest_address_hex = self._get_hex_address(to_address)
        amount_hex = hex(amount_sun)[2:].zfill(64)
        parameter = dest_address_hex.zfill(64) + amount_hex

        payload = {
            "owner_address": self._get_hex_address(self.owner_address),
            "contract_address": self._get_hex_address(self.config["token_address"]),
            "function_selector": "transfer(address,uint256)",
            "parameter": parameter,
            "fee_limit": self.config["fee_limit"],
            "visible": False
        }

        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=payload, headers={"TRON-PRO-API-KEY": self.api_key} if self.api_key else {})
            tx_data = resp.json()
            
            if not tx_data.get("result", {}).get("result"):
                raise HTTPException(status_code=400, detail="Tron transaction creation failed")
            
            # Note: You would typically use a library like 'solders' or 'tronpy' to sign locally
            # but for this logic, ensure you have a signing utility helper.
            return f"TRON_TX_INITIATED_{tx_data['transaction']['txID']}"

    def _get_hex_address(self, base58_addr: str) -> str:
        # This is a placeholder for base58 to hex conversion
        # Use 'base58' library to convert T... addresses to 41... hex
        return base58_addr # Implementation requires base58 library

# --- 3. MAIN ROUTER ---

async def process_crypto_withdrawal(to_address: str, amount_usd: float, network: str) -> str:
    """
    Unified entry point for all USDT withdrawals.
    """
    logger.info(f"Initiating {amount_usd} USDT withdrawal on {network}")
    
    try:
        if network in ["bep20", "erc20"]:
            handler = EVMWithdrawal(network)
            return await handler.process(to_address, amount_usd)
        
        elif network == "trc20":
            handler = TRC20Withdrawal()
            return await handler.process(to_address, amount_usd)
            
        else:
            raise ValueError(f"Unsupported crypto network: {network}")
            
    except Exception as e:
        logger.error(f"Crypto Withdrawal Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Blockchain error: {str(e)}")

def validate_crypto_address(address: str, network: str) -> bool:
    """Check if address is valid for the chosen network."""
    if network in ["bep20", "erc20"]:
        return Web3.is_address(address)
    elif network == "trc20":
        return address.startswith("T") and len(address) == 34
    return False