from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import aiohttp

load_dotenv()

router = APIRouter()

# Configuración de Siigo
SIIGO_USER = os.getenv("SIIGO_USER")
SIIGO_PARTNER_ID = os.getenv("SIIGO_PARTNER_ID")
SIIGO_API_URL = os.getenv("SIIGO_API_URL")
SIIGO_KEY = os.getenv("SIIGO_KEY")

class SiigoClient:
    def __init__(self):
        self.token = None
        self.token_expires = None

    async def get_token(self):
        if self.token and self.token_expires and datetime.now() < self.token_expires:
            return self.token

        if not SIIGO_USER or not SIIGO_KEY or not SIIGO_PARTNER_ID:
            raise Exception("Credenciales de Siigo incompletas.")

        try:
            async with aiohttp.ClientSession() as session:
                headers = {
                    "Content-Type": "application/json",
                    "Partner-Id": SIIGO_PARTNER_ID
                }
                body = {
                    "username": SIIGO_USER,
                    "access_key": SIIGO_KEY
                }

                async with session.post(f"{SIIGO_API_URL}/auth", headers=headers, json=body) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        self.token = data["access_token"]
                        self.token_expires = datetime.now() + timedelta(hours=23)
                        return self.token
                    else:
                        error = await resp.text()
                        raise Exception(f"Error al obtener el token: {resp.status} - {error}")
        except Exception as e:
            print(f"Error en get_token: {e}")
            raise

    async def get_products_paginated(self):
        token = await self.get_token()

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Partner-Id": SIIGO_PARTNER_ID
        }

        codigos_permitidos = ['S01', 'ESIM', 'HT01', 'R30D', 'R15D', 'R7D', 'R5D', 'MAPAV1']  # MAPAV1 = RECARGA MAPA V1
        all_products = []
        page = 1
        page_size = 200  # Verifica el máximo permitido por la API

        try:
            async with aiohttp.ClientSession() as session:
                while True:
                    url = f"{SIIGO_API_URL}/v1/products?page={page}&page_size={page_size}"
                    async with session.get(url, headers=headers) as resp:
                        if resp.status != 200:
                            error_text = await resp.text()
                            raise Exception(f"Error al obtener productos de Siigo: {resp.status} - {error_text}")

                        data = await resp.json()
                        
                        # Agregar solo los resultados, no toda la respuesta
                        if 'results' in data:
                            all_products.extend(data['results'])
                        
                        # Condición de terminación: no hay más páginas o no hay más resultados
                        if not data.get('_links', {}).get('next') or not data.get('results'):
                            break

                        page += 1

            # Filtrado por códigos exactos (no con startswith)
            filtered = [p for p in all_products if p.get("code") in codigos_permitidos]
            return filtered

        except Exception as e:
            print(f"Error en get_products_paginated: {e}")
            raise

siigo_client = SiigoClient()

@router.get("/products/siigo")
async def get_products_from_siigo():
    try:
        products = await siigo_client.get_products_paginated()
        return {"products": products}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
