import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://hotel-explorer-12.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---- root health ----
def test_root(api):
    r = api.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert "message" in r.json()


# ---- list hotels (seeded) ----
def test_list_hotels(api):
    r = api.get(f"{BASE_URL}/api/hotels")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 8, f"expected >=8 seeded hotels, got {len(data)}"
    h = data[0]
    for k in ("id", "name", "image_url", "location", "phone", "email"):
        assert k in h, f"missing field {k}"
    # No mongo _id leak
    assert "_id" not in h


# ---- get by id ----
def test_get_hotel_by_id(api):
    listing = api.get(f"{BASE_URL}/api/hotels").json()
    hid = listing[0]["id"]
    r = api.get(f"{BASE_URL}/api/hotels/{hid}")
    assert r.status_code == 200
    assert r.json()["id"] == hid


def test_get_hotel_not_found(api):
    r = api.get(f"{BASE_URL}/api/hotels/nonexistent-uuid")
    assert r.status_code == 404


# ---- create hotel + GET verify ----
def test_create_hotel_and_persist(api):
    payload = {
        "name": "TEST_Otel",
        "image_url": "https://example.com/img.jpg",
        "location": "TEST Sk., İstanbul",
        "phone": "+900000000000",
        "email": "test@test.com",
        "description": "TEST açıklama",
    }
    r = api.post(f"{BASE_URL}/api/hotels", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    assert created["name"] == payload["name"]
    assert created["id"]
    assert "_id" not in created

    # GET verification
    g = api.get(f"{BASE_URL}/api/hotels/{created['id']}")
    assert g.status_code == 200
    assert g.json()["name"] == payload["name"]
