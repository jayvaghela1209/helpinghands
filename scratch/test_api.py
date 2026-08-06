import asyncio
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    # Login corporate user
    login_res = client.post("/api/auth/login", json={
        "email": "corp1@gmail.com",
        "password": "password"
    })
    print("Login Status:", login_res.status_code)
    login_data = login_res.json()
    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch verified NGOs
    ngos_res = client.get("/api/csr/ngos", headers=headers)
    print("\nNGOs Status:", ngos_res.status_code)
    ngos_data = ngos_res.json()
    print("NGOs Data:")
    for n in ngos_data:
        print(f"- ID: {n['id']}, Name: {n['name']}, Focus: {n['focus_areas']}, Rating: {n['average_rating']}, Reviews: {n['total_reviews']}, Needs: {n['active_requirements_count']}")

    if ngos_data:
        ngo_id = ngos_data[0]["id"]
        # Fetch NGO Details
        details_res = client.get(f"/api/csr/ngos/{ngo_id}", headers=headers)
        print(f"\nNGO Details ({ngo_id}) Status:", details_res.status_code)
        details = details_res.json()
        print("Profile Name:", details["profile"]["name"])
        print("Registration No:", details["profile"]["registration_number"])
        print("Active Needs Count:", len(details["requirements"]))
        print("Reviews Count:", len(details["reviews"]))
        if details["reviews"]:
            print("First Review Comment:", details["reviews"][0]["review_comment"])

if __name__ == "__main__":
    run_tests()
