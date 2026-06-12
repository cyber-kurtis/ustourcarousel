from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------------------- Models ----------------------
class Hotel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    image_url: str
    location: str  # human-readable address
    phone: str
    email: str
    description: Optional[str] = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class HotelCreate(BaseModel):
    name: str
    image_url: str
    location: str
    phone: str
    email: str
    description: Optional[str] = ""


# ---------------------- Routes ----------------------
@api_router.get("/")
async def root():
    return {"message": "Otel Rehberi API"}


@api_router.get("/hotels", response_model=List[Hotel])
async def list_hotels():
    hotels = await db.hotels.find({}, {"_id": 0}).to_list(1000)
    return [Hotel(**h) for h in hotels]


@api_router.get("/hotels/{hotel_id}", response_model=Hotel)
async def get_hotel(hotel_id: str):
    hotel = await db.hotels.find_one({"id": hotel_id}, {"_id": 0})
    if not hotel:
        raise HTTPException(status_code=404, detail="Otel bulunamadı")
    return Hotel(**hotel)


@api_router.post("/hotels", response_model=Hotel)
async def create_hotel(payload: HotelCreate):
    hotel = Hotel(**payload.dict())
    await db.hotels.insert_one(hotel.dict())
    return hotel


# ---------------------- Seed ----------------------
SEED_HOTELS = [
    {
        "name": "Çırağan Sarayı Kempinski",
        "image_url": "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
        "location": "Çırağan Cd. No:32, Beşiktaş, İstanbul",
        "phone": "+902123264646",
        "email": "info@ciraganpalace.com",
        "description": "Boğaz manzaralı tarihi saray oteli.",
    },
    {
        "name": "Hilton İstanbul Bosphorus",
        "image_url": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80",
        "location": "Cumhuriyet Cd. No:50, Şişli, İstanbul",
        "phone": "+902123154646",
        "email": "info@hiltonistanbul.com",
        "description": "Şehir merkezinde lüks konaklama.",
    },
    {
        "name": "Swissôtel The Bosphorus",
        "image_url": "https://images.unsplash.com/photo-1455587734955-081b22074882?w=1200&q=80",
        "location": "Bayıldım Cd. No:2, Maçka, İstanbul",
        "phone": "+902123261100",
        "email": "istanbul@swissotel.com",
        "description": "Boğaz manzaralı 5 yıldızlı otel.",
    },
    {
        "name": "Mardan Palace Antalya",
        "image_url": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
        "location": "Kundu, Aksu, Antalya",
        "phone": "+902423104100",
        "email": "info@mardanpalace.com",
        "description": "Akdeniz kıyısında lüks tatil köyü.",
    },
    {
        "name": "Hillside Beach Club",
        "image_url": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
        "location": "Kalemya Koyu, Fethiye, Muğla",
        "phone": "+902526140333",
        "email": "hbc@hillside.com.tr",
        "description": "Fethiye'de özel koy ve plaj.",
    },
    {
        "name": "Cappadocia Cave Resort",
        "image_url": "https://images.unsplash.com/photo-1605346576608-9b9b96b8b5fa?w=1200&q=80",
        "location": "Uçhisar, Nevşehir",
        "phone": "+903842195200",
        "email": "info@ccr-hotels.com",
        "description": "Kapadokya'da kaya oyma butik otel.",
    },
    {
        "name": "Divan İstanbul",
        "image_url": "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80",
        "location": "Cumhuriyet Cd. No:2, Elmadağ, İstanbul",
        "phone": "+902123154141",
        "email": "istanbul@divan.com.tr",
        "description": "Taksim'de klasik şehir oteli.",
    },
    {
        "name": "Maxx Royal Belek",
        "image_url": "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80",
        "location": "İskele Mevkii, Belek, Antalya",
        "phone": "+902427100707",
        "email": "info@maxxroyal.com",
        "description": "Belek'te ultra her şey dahil tatil.",
    },
]


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def seed_hotels():
    count = await db.hotels.count_documents({})
    if count == 0:
        docs = [Hotel(**h).dict() for h in SEED_HOTELS]
        await db.hotels.insert_many(docs)
        logger.info(f"Seeded {len(docs)} hotels")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
