from fastapi import status


def test_root(client):
    resp = client.get("/")
    data = resp.json()

    assert resp.status_code == status.HTTP_200_OK
    assert data["message"] == "Skillora analytics backend is running"
