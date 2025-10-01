import os
import uuid
import aiohttp
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from database import engine, get_async_session
from models import Base, User
from services.sales import save_sale_to_db  
from fastapi import Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession
from utils.auth_utils import get_current_user




load_dotenv()

app = FastAPI(title="Local Sim Colombia API")

# ---- CORS ----
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

print("CORS cargado (localhost:* permitido).")


from routes.sales import router as sales_router
from routes.products import router as products_router
from routes.sims import router as sims_router
from routes.dashboard import router as dashboard_router
from routes.auth import router as auth_router
from routes.users import router as users_router
from routes import roles
from routes.turnos import router as turnos_router
from routes.winred import router as winred_router
from routes.devoluciones import router as devoluciones_router

# Routers
app.include_router(sales_router, prefix="/api")
app.include_router(products_router, prefix="/api")
app.include_router(sims_router, prefix="/api/sims")
app.include_router(dashboard_router, prefix="/api/dashboard")
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(users_router, prefix="/api/users", tags=["Usuarios"])
app.include_router(roles.router, prefix="/api/roles", tags=["Roles"])
app.include_router(turnos_router)
app.include_router(winred_router, prefix="/api/winred", tags=["Winred"])
app.include_router(devoluciones_router, prefix="/api/devoluciones", tags=["Devoluciones"])






@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Tablas verificadas o creadas")

# Modelos
class TaxItem(BaseModel):
    id: int
    name: Optional[str]
    type: Optional[str]
    percentage: Optional[float]

class CartItem(BaseModel):
    product_id: str
    product_code: str
    quantity: int
    unit_price: float
    description: str  
    sim_id: Optional[str] = None
    selected_plan: Optional[str] = None
    taxes: Optional[List[TaxItem]] = []

class SaleRequest(BaseModel):
    items: List[CartItem]
    payment_method: str  # "electronic" or "cash"
    customer_id: str
    customer_identification: str

# Cliente Siigo
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
            print("🔐 Obteniendo token de Siigo con /auth")

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
                    print(f"🔄 Status de respuesta: {resp.status}")
                    body = await resp.text()  # primero leemos el texto sin asumir JSON
                    print("🧾 Respuesta cuerpo crudo:", body)

                    if resp.status in [200, 201]:
                        try:
                            data = json.loads(body)
                            self.token = data["access_token"]
                            self.token_expires = datetime.now() + timedelta(seconds=data.get("expires_in", 86400))
                            print("Token obtenido:", self.token[:10], "...")
                            return self.token
                        except Exception as json_err:
                            raise Exception(f"Error parseando JSON del token: {json_err} — Body: {body}")
                    else:
                        raise Exception(f"Error HTTP al obtener token: {resp.status} — {body}")

        except Exception as e:
            print(f"⛔ Error en get_token(): {e}")
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
                    print("Error en respuesta Siigo:")
                    print(f"Status: {resp.status}")
                    print(f"Body: {error_text}")

                    raise Exception(f"Siigo API error {resp.status}: {error_text}")

siigo_client = SiigoClient()

# Endpoint de salud
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# Crear factura en Siigo
@app.post("/api/sales/create_invoice")
async def create_siigo_invoice(
    sale_data: SaleRequest,
    db: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user)  # 👈 tomamos el usuario autenticado
):
    try:
        today = datetime.now().strftime("%Y-%m-%d")

        total_invoice = 0
        items_for_siigo = []

        for item in sale_data.items:
            price_with_tax = round(item.unit_price, 2)
            item_total = round(price_with_tax * item.quantity, 2)
            total_invoice = round(total_invoice + item_total, 2)

            items_for_siigo.append({
                "code": item.product_code,
                "description": item.description,
                "quantity": item.quantity,
                # precio sin impuesto si hay taxes, igual que antes:
                "price": round(item.unit_price / (1 + (item.taxes[0].percentage / 100)), 2) if item.taxes else item.unit_price,
                "price_include_tax": False,
                "unit": {"code": "94"},
                "discount": 0,
                "taxes": [{"id": tax.id} for tax in (item.taxes or [])]
            })

        invoice_payload = {
            "document": {"id": 27652},
            "date": today,
            "customer": {
                "id": sale_data.customer_id,
                "person_type": "Person",
                "id_type": "13",
                "identification": sale_data.customer_identification,
                "name": ["Cliente", "Final"],
                "city": {"country_code": "CO", "state_code": "05", "city_code": "050015"},
                "contacts": [{"first_name": "Cliente", "last_name": "Final", "email": "cliente@email.com"}]
            },
            "seller": 54,
            "observations": "Venta Local Sim Colombia",
            "stamp": {"send": True},
            "mail": {"send": True},
            "items": items_for_siigo,
            "payments": [{"id": 471, "value": round(total_invoice, 2), "due_date": today}]
        }

        print("📦 Enviando payload a Siigo:", json.dumps(invoice_payload, indent=2))

        # 1) Crear factura en Siigo (sin user_id en el payload)
        response = await siigo_client.make_request("POST", "/v1/invoices", json=invoice_payload)
        siigo_invoice_id = str(response.get("number") or response.get("id"))

        # 2) Guardar en la BD con el user_id del usuario autenticado 👇
        await save_sale_to_db(
            sale_data,
            db,
            siigo_invoice_id=siigo_invoice_id,
            user_id=current_user.id  
        )

        return response

    except Exception as e:
        print(f"Error creando la factura en Siigo: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
