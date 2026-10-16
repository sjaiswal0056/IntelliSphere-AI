import io
import pytest

def test_list_datasets(client, auth_headers):
    """Test listing available datasets."""
    response = client.get("/api/datasets", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1  # Preseeded sample datasets

def test_upload_and_inspect_dataset(client, auth_headers):
    """Test uploading a CSV dataset, auto-profiling, and previewing schema."""
    csv_content = (
        "transaction_id,amount,customer_age,category,is_churn\n"
        "TX-001,45.50,32,Retail,0\n"
        "TX-002,120.00,45,Electronics,1\n"
        "TX-003,15.20,28,Grocery,0\n"
        "TX-004,89.90,52,Retail,0\n"
        "TX-005,250.00,39,Electronics,1\n"
    )
    files = {
        "file": ("test_upload_dataset.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv"),
    }
    data = {
        "name": "Integration Test Upload",
        "description": "Automated dataset profiling test",
        "source_type": "csv_upload",
    }

    response = client.post("/api/datasets/upload", data=data, files=files, headers=auth_headers)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["name"] == "Integration Test Upload"
    assert res_data["row_count"] == 5
    assert res_data["column_count"] == 5
    assert len(res_data["schemas"]) == 5
    assert "profile" in res_data
    assert res_data["profile"]["quality_score"] > 80.0
    assert len(res_data["preview"]) == 5

    # Test retrieving details
    dataset_id = res_data["id"]
    detail_res = client.get(f"/api/datasets/{dataset_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == dataset_id
