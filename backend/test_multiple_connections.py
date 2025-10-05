#!/usr/bin/env python3
"""
Script para testar múltiplas conexões WebRTC simultâneas
"""

import asyncio
import json
import time
import uuid
from typing import List, Dict, Any
import aiohttp
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class WebRTCTestClient:
    def __init__(self, client_id: str, server_url: str = "http://localhost:8001"):
        self.client_id = client_id
        self.server_url = server_url
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_health(self) -> Dict[str, Any]:
        """Test health endpoint"""
        try:
            async with self.session.get(f"{self.server_url}/health") as response:
                return await response.json()
        except Exception as e:
            logger.error(f"[{self.client_id}] Health check failed: {e}")
            return {"error": str(e)}
    
    async def test_config(self) -> Dict[str, Any]:
        """Test config endpoint"""
        try:
            async with self.session.get(f"{self.server_url}/config") as response:
                return await response.json()
        except Exception as e:
            logger.error(f"[{self.client_id}] Config check failed: {e}")
            return {"error": str(e)}
    
    async def test_connection_stats(self) -> Dict[str, Any]:
        """Test connection stats endpoint"""
        try:
            async with self.session.get(f"{self.server_url}/connection-stats") as response:
                return await response.json()
        except Exception as e:
            logger.error(f"[{self.client_id}] Connection stats failed: {e}")
            return {"error": str(e)}
    
    async def test_ice_servers(self) -> Dict[str, Any]:
        """Test ICE servers endpoint"""
        try:
            ice_servers = [
                {"urls": "stun:stun.l.google.com:19302"},
                {"urls": "stun:stun.cloudflare.com:3478"}
            ]
            async with self.session.post(
                f"{self.server_url}/ice-servers",
                json={"iceServers": ice_servers}
            ) as response:
                return await response.json()
        except Exception as e:
            logger.error(f"[{self.client_id}] ICE servers test failed: {e}")
            return {"error": str(e)}

async def test_single_client(client_id: str) -> Dict[str, Any]:
    """Test a single client connection"""
    results = {}
    
    async with WebRTCTestClient(client_id) as client:
        logger.info(f"Testing client: {client_id}")
        
        # Test all endpoints
        results["health"] = await client.test_health()
        results["config"] = await client.test_config()
        results["ice_servers"] = await client.test_ice_servers()
        results["connection_stats"] = await client.test_connection_stats()
        
        logger.info(f"[{client_id}] Tests completed")
        
    return results

async def test_multiple_clients(num_clients: int = 3) -> List[Dict[str, Any]]:
    """Test multiple clients simultaneously"""
    logger.info(f"Testing {num_clients} clients simultaneously")
    
    # Create client tasks
    tasks = []
    for i in range(num_clients):
        client_id = f"test-client-{i+1}"
        task = asyncio.create_task(test_single_client(client_id))
        tasks.append(task)
    
    # Wait for all clients to complete
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    logger.info("All clients completed")
    return results

async def main():
    """Main test function"""
    logger.info("Starting multiple connection test")
    
    # Test 1: Single client
    logger.info("=== Test 1: Single Client ===")
    single_result = await test_single_client("single-test")
    logger.info(f"Single client result: {json.dumps(single_result, indent=2)}")
    
    await asyncio.sleep(1)
    
    # Test 2: Multiple clients
    logger.info("=== Test 2: Multiple Clients ===")
    multiple_results = await test_multiple_clients(3)
    
    for i, result in enumerate(multiple_results):
        if isinstance(result, Exception):
            logger.error(f"Client {i+1} failed with exception: {result}")
        else:
            logger.info(f"Client {i+1} completed successfully")
    
    await asyncio.sleep(1)
    
    # Test 3: Check final connection stats
    logger.info("=== Test 3: Final Connection Stats ===")
    async with WebRTCTestClient("final-check") as client:
        final_stats = await client.test_connection_stats()
        logger.info(f"Final stats: {json.dumps(final_stats, indent=2)}")
    
    logger.info("Test completed")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Test interrupted by user")
    except Exception as e:
        logger.error(f"Test failed with error: {e}")
