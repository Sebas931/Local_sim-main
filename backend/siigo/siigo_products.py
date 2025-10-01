import aiohttp
import os
from datetime import datetime, timedelta

# Cache de token básico
_token_cache = {
    "token": None,
    "expires_at": None
}

async def obtener_token():
    if _token_cache["token"] and _token_cache["expires_at"] > datetime.now():
        return _token_cache["token"]

    url = f"{os.getenv('SIIGO_API_URL')}/oauth2/token"
    auth = aiohttp.BasicAuth(os.getenv("SIIGO_USER"), os.getenv("SIIGO_KEY"))

    async with aiohttp.ClientSession() as session:
        async with session.post(url, auth=auth) as response:
            if response.status == 200:
                data = await response.json()
                _token_cache["token"] = data["access_token"]
                _token_cache["expires_at"] = datetime.now() + timedelta(hours=23)
                return data["access_token"]
            else:
                raise Exception(f"Error obteniendo token de Siigo: {response.status}")

async def fetch_filtered_products():
    token = await obtener_token()

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Partner-Id": os.getenv("SIIGO_PARTNER_ID")
    }

    url = f"{os.getenv('SIIGO_API_URL')}/v1/products?page=1&page_size=153"

    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers) as response:
            if response.status not in [200, 201]:
                error = await response.text()
                raise Exception(f"Error consultando productos de Siigo: {response.status}, {error}")

            data = await response.json()
            results = data.get("results", []) if isinstance(data, dict) else data

            codigos_permitidos = ['S01', 'ESIM', 'HT01', 'R30D', 'R15D', 'R7D']
            productos = []

            for p in results:
                code = p.get("code", "")
                if any(code.startswith(pref) for pref in codigos_permitidos):
                    precio = (
                        p.get("prices", [{}])[0]
                        .get("price_list", [{}])[0]
                        .get("value", 0)
                    )
                    productos.append({
                        "id": p.get("id"),
                        "name": p.get("name"),
                        "code": code,
                        "type": p.get("type"),
                        "price": float(precio),
                        "source": "siigo"
                    })

            return productos
