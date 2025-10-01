import os
import aiohttp
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

load_dotenv()

class SiigoClient:
    def __init__(self):
        self.user = os.getenv("SIIGO_USER")
        self.partner_id = os.getenv("SIIGO_PARTNER_ID")
        self.api_url = os.getenv("SIIGO_API_URL")
        self.access_key = os.getenv("SIIGO_KEY")
        self.token = None
        self.token_expires = None

    async def get_token(self):
        if self.token and self.token_expires and datetime.now() < self.token_expires:
            return self.token

        try:
            headers = {
                "Content-Type": "application/json",
                "Partner-Id": self.partner_id
            }
            payload = {
                "username": self.user,
                "access_key": self.access_key
            }

            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.api_url}/auth", json=payload, headers=headers) as resp:
                    body = await resp.text()
                    if resp.status in [200, 201]:
                        data = json.loads(body)
                        self.token = data["access_token"]
                        self.token_expires = datetime.now() + timedelta(seconds=data.get("expires_in", 86400))
                        return self.token
                    else:
                        raise Exception(f"Error HTTP: {resp.status} — {body}")
        except Exception as e:
            raise

    async def make_request(self, method: str, endpoint: str, **kwargs):
        token = await self.get_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Partner-Id": self.partner_id
        }

        async with aiohttp.ClientSession() as session:
            async with session.request(method, f"{self.api_url}{endpoint}", headers=headers, **kwargs) as resp:
                if resp.status in [200, 201]:
                    return await resp.json()
                else:
                    error_text = await resp.text()
                    raise Exception(f"Siigo API error {resp.status}: {error_text}")

siigo_client = SiigoClient()