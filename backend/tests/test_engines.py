import pytest

def test_retail_forecast_endpoint(client, auth_headers):
    """Test Retail sales forecast returns genuine LightGBM predictions and intervals."""
    response = client.post("/api/retail/forecast", json={"horizon_days": 14}, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "models_comparison" in data
    assert "future_forecast" in data
    assert len(data["future_forecast"]) == 14
    first_pred = data["future_forecast"][0]
    assert "date" in first_pred
    assert "forecast" in first_pred
    assert "lower_bound" in first_pred
    assert "upper_bound" in first_pred
    assert first_pred["upper_bound"] >= first_pred["lower_bound"]

def test_retail_segmentation_endpoint(client, auth_headers):
    """Test Retail customer RFM segmentation returns 4 clusters with profiles."""
    response = client.get("/api/retail/segments", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "silhouette_score" in data
    assert "cluster_profiles" in data
    assert len(data["cluster_profiles"]) == 4

def test_retail_inventory_simulation(client, auth_headers):
    """Test Retail Monte Carlo inventory simulation."""
    payload = {
        "daily_demand_mean": 25.0,
        "daily_demand_std": 5.0,
        "lead_time_days": 7,
        "current_stock": 100,
        "unit_cost": 30.0,
        "holding_cost_rate": 0.20,
        "service_level": 0.95,
    }
    response = client.post("/api/retail/inventory", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "safety_stock" in data
    assert "reorder_point" in data
    assert "simulated_stockout_risk_pct" in data

def test_fraud_prediction_endpoint(client, auth_headers):
    """Test Credit card fraud risk score prediction."""
    payload = {
        "amount": 149.50,
        "time": 45000.0,
        "v_features": {"V14": -2.5, "V10": -1.8, "V4": 1.2},
        "risk_threshold": 0.50,
    }
    response = client.post("/api/fraud/predict", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "fraud_probability" in data
    assert 0.0 <= data["fraud_probability"] <= 1.0
    assert "risk_level" in data
    assert "top_drivers" in data
    assert "disclaimer" in data

def test_maintenance_prediction_endpoint(client, auth_headers):
    """Test Industrial predictive maintenance failure classification."""
    payload = {
        "machine_type": "M",
        "air_temp_k": 300.5,
        "process_temp_k": 310.8,
        "rotational_speed_rpm": 1450.0,
        "torque_nm": 45.0,
        "tool_wear_min": 120.0,
        "threshold": 0.50,
    }
    response = client.post("/api/maintenance/predict", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "failure_probability" in data
    assert "health_status" in data
    assert "scientific_disclaimer" in data
    assert "remaining useful life" in data["scientific_disclaimer"].lower()

def test_healthcare_prediction_endpoint(client, auth_headers):
    """Test Healthcare risk estimation with mandatory clinical disclaimer."""
    payload = {
        "age": 58.0,
        "sex": 1,
        "cp": 2,
        "trestbps": 135.0,
        "chol": 245.0,
        "fbs": 0,
        "restecg": 0,
        "thalach": 155.0,
        "exang": 0,
        "oldpeak": 1.2,
        "slope": 1,
        "ca": 0.0,
        "thal": 2.0,
    }
    response = client.post("/api/healthcare/research-predict", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "statistical_risk_estimate" in data
    assert "confidence_level" in data
    assert "mandatory_disclaimer" in data
    # Verify strict clinical safeguard: not a clinical diagnosis
    assert "not a clinical diagnosis" in data["mandatory_disclaimer"].lower()

def test_recommendations_user_endpoint(client, auth_headers):
    """Test MovieLens collaborative filtering recommendations for user."""
    response = client.get("/api/recommendations/user/1?k=5", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "user_id" in data
    assert "recommendations" in data
    assert len(data["recommendations"]) == 5
    first_rec = data["recommendations"][0]
    assert "movie_id" in first_rec
    assert "title" in first_rec
    assert "predicted_affinity" in first_rec

def test_recommendations_similar_item_endpoint(client, auth_headers):
    """Test Item-item cosine similarity recommendations."""
    # Toy Story (1995) has movieId 1
    response = client.get("/api/recommendations/similar/1?k=4", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "source_movie" in data
    assert "similar_items" in data
    assert len(data["similar_items"]) == 4
