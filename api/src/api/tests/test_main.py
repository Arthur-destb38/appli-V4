import importlib


def test_read_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_api_module_exports():
    module = importlib.import_module("api")
    module.bootstrap()
