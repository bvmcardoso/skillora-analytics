import pytest
from fastapi import status

pytestmark = pytest.mark.integration


def test_health(client):
    resp = client.get("/health")
    data = resp.json()

    assert resp.status_code == status.HTTP_200_OK
    assert data["application"] == "ok"
    assert data["db"] == "ok"
