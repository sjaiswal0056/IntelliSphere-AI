"""
IntelliSphere AI — Retail Inventory Intelligence Engine
Forecast-based reorder calculations, Safety Stock, Reorder Point, and Monte Carlo Stockout Simulation.
"""

import math
import numpy as np
from typing import Dict, Any, List

SERVICE_LEVEL_Z = {
    0.90: 1.282,
    0.95: 1.645,
    0.98: 2.054,
    0.99: 2.326
}

def calculate_inventory_policy(
    daily_demand_mean: float,
    daily_demand_std: float,
    lead_time_days: int = 7,
    current_stock: int = 150,
    unit_cost: float = 25.0,
    holding_cost_rate: float = 0.20,  # 20% annual carrying cost
    service_level: float = 0.95
) -> Dict[str, Any]:
    """Calculate safety stock, reorder point, carrying costs, and stockout risk."""
    z_score = SERVICE_LEVEL_Z.get(service_level, 1.645)

    # Safety Stock formula: SS = Z * sigma_L = Z * sigma_D * sqrt(L)
    safety_stock = math.ceil(z_score * daily_demand_std * math.sqrt(lead_time_days))
    
    # Lead time demand = D * L
    lead_time_demand = daily_demand_mean * lead_time_days

    # Reorder Point (ROP) = (D * L) + SS
    reorder_point = math.ceil(lead_time_demand + safety_stock)

    # Need Reorder?
    needs_reorder = current_stock <= reorder_point
    recommended_order_quantity = math.ceil(max(0, (reorder_point + (daily_demand_mean * 14)) - current_stock)) if needs_reorder else 0

    # Days of Inventory Remaining (DOIR)
    days_of_stock = round(current_stock / max(1.0, daily_demand_mean), 1)

    # Annual Carrying Cost = (Average Inventory = SS + Q/2) * Unit Cost * Holding Rate
    avg_inventory = safety_stock + (recommended_order_quantity / 2 if recommended_order_quantity > 0 else current_stock / 2)
    annual_carrying_cost = round(avg_inventory * unit_cost * holding_cost_rate, 2)

    # Monte Carlo Stockout Risk Simulation (500 iterations)
    np.random.seed(42)
    simulated_demand_during_lt = np.random.normal(lead_time_demand, daily_demand_std * math.sqrt(lead_time_days), 500)
    stockouts = np.sum(simulated_demand_during_lt > current_stock)
    simulated_stockout_prob = float(stockouts / 500)

    # Simulation histogram distribution
    hist, bin_edges = np.histogram(simulated_demand_during_lt, bins=10)
    demand_distribution = [
        {"bin": f"{int(bin_edges[i])}-{int(bin_edges[i+1])}", "frequency": int(hist[i])}
        for i in range(len(hist))
    ]

    return {
        "service_level": service_level,
        "lead_time_days": lead_time_days,
        "current_stock": current_stock,
        "daily_demand_mean": round(daily_demand_mean, 1),
        "daily_demand_std": round(daily_demand_std, 1),
        "safety_stock": safety_stock,
        "lead_time_demand": round(lead_time_demand, 1),
        "reorder_point": reorder_point,
        "needs_reorder": needs_reorder,
        "recommended_order_quantity": recommended_order_quantity,
        "days_of_inventory_remaining": days_of_stock,
        "annual_carrying_cost_estimate": annual_carrying_cost,
        "simulated_stockout_risk_pct": round(simulated_stockout_prob * 100, 1),
        "simulation_distribution": demand_distribution
    }
