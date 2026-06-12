"""One-shot import: replace existing hotels with Balkan list from the user's Excel."""
import os
import asyncio
import uuid
import re
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Rotating high-quality hotel images (Unsplash CDN)
HOTEL_IMAGES = [
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&q=80",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=1200&q=80",
    "https://images.unsplash.com/photo-1455587734955-081b22074882?w=1200&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1200&q=80",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1200&q=80",
    "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&q=80",
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=1200&q=80",
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200&q=80",
    "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=1200&q=80",
    "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=1200&q=80",
]

HOTELS = [
    {"name": "Bliss", "location": "Street Number 5 – Skopje, 1000", "phone": "+389 75 466 374", "website": "https://hotelblisspalace.com", "country": "Makedonya"},
    {"name": "Embla", "location": "Partizanska nr.1, Struga 6330", "phone": "+389 75 426 083", "website": "https://www.embla.mk", "country": "Makedonya"},
    {"name": "Deluxe Resort", "location": "E762, Koplik", "phone": "+355 68 404 0117", "website": "https://deluxeresort.al", "country": "Arnavutluk"},
    {"name": "Bushi", "location": "Kjurchiska 21 Skopje, 1000", "phone": "+389 70 462 948", "website": "https://bushiresort.com/", "country": "Makedonya"},
    {"name": "Beograd", "location": "Kej 8 mi Noemvri, Struga", "phone": "+389 70 536 810", "website": "", "country": "Makedonya"},
    {"name": "Holiday", "location": "Koplik Rruga Kishes Albania, 4301", "phone": "+355 69 731 1111", "website": "", "country": "Arnavutluk"},
    {"name": "Doa", "location": "Str:190, No:3 Skopje MK, 1000", "phone": "+389 70 230 150", "website": "https://hoteldoa.com/", "country": "Makedonya"},
    {"name": "Imperial", "location": "Partizanska br.15 Struga 6330", "phone": "+389 78 362 288", "website": "http://www.imperialstruga.com/", "country": "Makedonya"},
    {"name": "Gardenland", "location": "Albania", "phone": "+355 69 206 0524", "website": "https://gardenlandresort.com/", "country": "Arnavutluk"},
    {"name": "Austrian Palace", "location": "Blv Nikola Karev Skopje, 1000", "phone": "+389 70 515 035", "website": "https://austrianpalacehotel.mk", "country": "Makedonya"},
    {"name": "Belvedere", "location": "Sveti Stefan 6000", "phone": "+389 78 304 650", "website": "https://hotelbelvedere.com.mk/", "country": "Makedonya"},
    {"name": "Exalco", "location": "BUSHAT, SH1 Shkoder AL, 4021", "phone": "+355 307 6352", "website": "https://kompleksiexalco-al.al/", "country": "Arnavutluk"},
    {"name": "Actor", "location": "Hasan Prishtina 114 Skopje, 1000", "phone": "+389 76 454 899", "website": "https://www.actor.mk/", "country": "Makedonya"},
    {"name": "Aqualina", "location": "St. Stefan Ohrid, 6000", "phone": "+389 75 607 606", "website": "https://aqualina.com.mk/", "country": "Makedonya"},
    {"name": "Liss", "location": "Shetitorja Gjergj Fishta, Lezhe 4501", "phone": "+355 67 200 9841", "website": "", "country": "Arnavutluk"},
    {"name": "Bon Bon", "location": "Aleksandar Urdarevski 33 Skopje, 1000", "phone": "+389 70 372 008", "website": "https://bonbonresort.mk/", "country": "Makedonya"},
    {"name": "Millenium", "location": "Kej Makedonija bb, Ohrid 6000", "phone": "+389 46 263 361", "website": "https://milleniumpalace.com.mk/en/", "country": "Makedonya"},
    {"name": "Golden Palace", "location": "Bulevardi Skenderbeu Nr.22", "phone": "+355 22 600 333", "website": "https://hotelgoldenpalace.al/", "country": "Arnavutluk"},
    {"name": "Mercure", "location": "Avenue Marshall Tito Tetovo, 1200", "phone": "+389 44 511 276", "website": "https://all.accor.com/hotel/A356", "country": "Makedonya"},
    {"name": "Sileks", "location": "Settlement St. Stefan bb, Ohrid", "phone": "+389 46 277 300", "website": "https://hotelsileks.mk/", "country": "Makedonya"},
    {"name": "Nord", "location": "Revolucioni Antikomunist Hungarez", "phone": "+355 69 677 5090", "website": "https://nordhotelboutique.com/", "country": "Arnavutluk"},
    {"name": "Best Western", "location": "Gjuro Strugar, Skopje 1000", "phone": "+389 75 554 773", "website": "https://www.bestwestern.com/", "country": "Makedonya"},
    {"name": "International", "location": "St. Asnom n. 59 Ohrid, 6000", "phone": "+389 71 261 004", "website": "https://hotelinternational.mk", "country": "Makedonya"},
    {"name": "Mozart", "location": "Rruga Marin Bicikemi, Shkodër 4001, Albania", "phone": "+355 22 600111", "website": "https://hotelmozart.al/contact/", "country": "Arnavutluk"},
    {"name": "Village", "location": "4RC5+VPR, 7-mi Noemvri 179, Ohrid 6000", "phone": "+389 46 251 621", "website": "http://hotelvillage.mk", "country": "Makedonya"},
    {"name": "Royal", "location": "Rruga Peshkimi, Shkodër 4001, Albania", "phone": "+355 69 678 5857", "website": "https://hotelroyal.albania-hotel.top/en/", "country": "Arnavutluk"},
    {"name": "Exclusive Sarajevo", "location": "Safeta Zajke 420 Sarajevo, 7100", "phone": "+387 61 256 830", "website": "https://hotel-exclusive.ba/", "country": "Bosna Hersek"},
    {"name": "Espana", "location": "Ive Andric bb Sarajevo, 7100", "phone": "+387 65 967 436", "website": "https://www.hotelespana.eu/", "country": "Bosna Hersek"},
    {"name": "Nobel Palace", "location": "Ruzveltova 23, Beograd 11000", "phone": "+381 66 818 1112", "website": "https://nobelpalace.rs/", "country": "Sırbistan"},
    {"name": "Brotnjo", "location": "Brocanska 2, Citluk 88260", "phone": "+387 63 634 264", "website": "https://www.hotelbrotnjo.ba/", "country": "Bosna Hersek"},
    {"name": "Almanas", "location": "Kurta Schorka 22, Sarajevo, BiH", "phone": "+387 61 256 830", "website": "https://www.hotel-almanas.com", "country": "Bosna Hersek"},
    {"name": "Nobel Zira", "location": "Ruzveltova 35, Beograd 11000, Serbia", "phone": "+381 64 845 4092", "website": "https://hotelnobelzira.beogradhotel.com", "country": "Sırbistan"},
    {"name": "Ivona", "location": "Kralja Tomislava 63 Medjugorje 88266", "phone": "+387 63 314 836", "website": "http://www.hotel-ivona.com/", "country": "Bosna Hersek"},
    {"name": "Hollywood", "location": "Dr. Mustafe Pintola 23, Ilidza 71210", "phone": "+387 61 256 830", "website": "https://www.hotel-hollywood.ba/", "country": "Bosna Hersek"},
    {"name": "Nobel West", "location": "Visegradska 23 Beograd 11000", "phone": "+381 66 809 1909", "website": "https://nobelwest.rs/en", "country": "Sırbistan"},
    {"name": "Grad Sunca Trebinje", "location": "Niksicki put bb, Trebinje 89101", "phone": "+387 59 490 300", "website": "https://gradsuncatrebinje.com/sr/", "country": "Bosna Hersek"},
    {"name": "Orange", "location": "Mala Aleja 73, Ilidža 71210", "phone": "+387 61 256 830", "website": "https://hotelorange.ba", "country": "Bosna Hersek"},
    {"name": "In Hotel", "location": "Bulevar Arsenija Carnojevica 56, Belgrade", "phone": "+381 11 310 5300", "website": "https://www.inhotel-belgrade.rs/en", "country": "Sırbistan"},
    {"name": "Panorama", "location": "Draženska gora, Trebinje", "phone": "+387 59 491 200", "website": "", "country": "Bosna Hersek"},
    {"name": "Brcko Gas", "location": "Kasindolskog bataljona bb, 71123 Sarajevo", "phone": "+387 61 256 830", "website": "https://brckogas.net", "country": "Bosna Hersek"},
    {"name": "Air Star", "location": "Mire Trailović 4a, Surčin, Serbia", "phone": "+381 69 818 7888", "website": "https://airstarhotel.rs/", "country": "Sırbistan"},
    {"name": "Bijeli Grad", "location": "Draženska gora, Trebinje", "phone": "+387 59 491 200", "website": "", "country": "Bosna Hersek"},
    {"name": "Radon Plaza", "location": "Džemala Bijedića 185, Sarajevo", "phone": "+387 61 256 830", "website": "https://radonplaza.ba", "country": "Bosna Hersek"},
    {"name": "Hedonic", "location": "A1, Street number 13 Београд, 11000", "phone": "+381 62 156 4063", "website": "https://hedonichotel.rs/en/", "country": "Sırbistan"},
    {"name": "Ha Hotel", "location": "Maršala Tita bb. 88000 Mostar", "phone": "+387 61 102 490", "website": "https://ha-hotel.ba", "country": "Bosna Hersek"},
    {"name": "Abba", "location": "Krusevacka 38, Beograd 11000", "phone": "+381 69 323 4551", "website": "https://abbahotel.rs/", "country": "Sırbistan"},
    {"name": "Ihtis", "location": "Kardinala Stepinca 48D, Međugorje 88266", "phone": "+387 63 589 858", "website": "https://hotel-ihtis.com/en/", "country": "Bosna Hersek"},
    {"name": "Royal Inn Belgrade", "location": "Kralja Petra 56, Belgrade 11000", "phone": "+381 69 323 4465", "website": "https://royalinn.rs/", "country": "Sırbistan"},
    {"name": "St. Benedict", "location": "Josipa Bana Jelacica bb Bijakovici 88266", "phone": "+387 63 426 893", "website": "https://medjugorjestbenedict.com/", "country": "Bosna Hersek"},
    {"name": "Zoo Sofia", "location": "Blvd. Simeonovsko shose no.6, Sofia", "phone": "+359 896 666 888", "website": "https://hotelzoosofia.com/", "country": "Bulgaristan"},
    {"name": "Theater Belgrade", "location": "Karadordeva 9, Beograd 11080", "phone": "+389 64 882 5891", "website": "https://theaterhotelbelgrade.com/", "country": "Sırbistan"},
    {"name": "Ami-M", "location": "Magistrala JTC, Zagrebačka 69", "phone": "+387 36 885 061", "website": "https://hotelami-m.com/", "country": "Bosna Hersek"},
    {"name": "Sveta Sofia", "location": "Pirotska St 18, 1000 Sofia", "phone": "+359 88 868 0886", "website": "https://hotelsvetasofia.com/", "country": "Bulgaristan"},
    {"name": "Jump Inn", "location": "Koče Popovića 2, 11000 Belgrade", "phone": "+381 64 810 8433", "website": "https://www.jumpinnhotelbelgrade.com", "country": "Sırbistan"},
    {"name": "Putnik Inn", "location": "Palmira Toljatila 9, 11070 Novi Beograd", "phone": "+381 60 225 9816", "website": "https://putnik.com/", "country": "Sırbistan"},
    {"name": "Edita Ulcinj", "location": "Ul. Majke Tereze bb, 85360 Ulcinj", "phone": "+382 69 635 421", "website": "https://hoteledita.me", "country": "Karadağ"},
    {"name": "Queen Olga", "location": "Vasilissis Olgas Av 44, 54641 Thessaloniki", "phone": "+30 2310 824621", "website": "https://www.queenolga.gr", "country": "Yunanistan"},
]


def _phone_clean(p: str) -> str:
    return re.sub(r"\s+", "", p.strip()) if p else ""


async def run():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    deleted = await db.hotels.delete_many({})
    print(f"Deleted {deleted.deleted_count} existing hotels")

    docs = []
    for i, h in enumerate(HOTELS):
        docs.append({
            "id": str(uuid.uuid4()),
            "name": h["name"],
            "image_url": HOTEL_IMAGES[i % len(HOTEL_IMAGES)],
            "location": h["location"],
            "phone": _phone_clean(h["phone"]),
            "email": "",
            "website": h.get("website", ""),
            "country": h.get("country", ""),
            "description": "",
            "created_at": datetime.now(timezone.utc),
        })

    await db.hotels.insert_many(docs)
    print(f"Inserted {len(docs)} hotels")
    client.close()


if __name__ == "__main__":
    asyncio.run(run())
