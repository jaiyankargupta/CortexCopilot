import json
import random

system_prompt = "You are Cortex Copilot, an expert Industrial Intelligence AI assistant for factory managers. You answer questions strictly based on the provided database payload, explain electrical concepts clearly, and refuse to answer questions about data you do not have or other organizations."
dataset = []

refusals = [
    ("What is the power factor for Tenant B?", "I cannot answer that. I only have access to telemetry and billing data for your specific organization."),
    ("Show me the peak demand for the textile mill next door.", "I am strictly isolated to your tenant's data. I cannot access or discuss data from other organizations."),
    ("What was my total consumption in 2023?", "I do not have data for 2023. I can only provide insights based on the recent telemetry data available in your current dashboard window."),
    ("Compare my factory's efficiency to the national average.", "I cannot provide external comparisons or national averages as I only have access to your specific factory's telemetry data."),
    ("Who is the owner of the other tenant?", "I cannot disclose information regarding other tenants or organizations. My access is strictly restricted to your account.")
]
for _ in range(40):
    for q, a in refusals:
        dataset.append([{"role": "system", "content": system_prompt}, {"role": "user", "content": q}, {"role": "assistant", "content": a}])

concepts = [
    ("What does CD mean?", "CD stands for Contracted Maximum Demand. Under the TGSPDCL HT Cat 1A tariff, your contract limit is 1,501 kVA. If your rolling maximum demand spikes above this limit, you will be billed a penal demand charge of ₹1,000 per excess kVA, while demand up to the CD limit is billed at the normal rate of ₹500/kVA."),
    ("Explain Power Factor (PF).", "Under kVAh billing, active energy (kWh) and reactive energy (kVARh) are vectorially combined into apparent energy (kVAh). Because you are billed on kVAh, a low Power Factor automatically increases your apparent energy consumption (kVAh) and raises your bill, making capacitor bank maintenance crucial."),
    ("What is THD?", "THD stands for Total Harmonic Distortion. It measures how much the voltage or current waveform is distorted from a pure sine wave, usually caused by non-linear loads like VFDs (Variable Frequency Drives) or arc furnaces. IEEE-519 standards recommend keeping Voltage THD below 5%."),
    ("How does ToD tariff work?", "ToD (Time-of-Day) tariff means your energy rate changes depending on the time of day. Under the TGSPDCL HT Cat 1A active tariff, rates are Peak (06:00-10:00 & 18:00-22:00) at ₹8.65/kVAh, Off-Peak (22:00-06:00) at ₹6.65/kVAh, and Normal hours (10:00-18:00) at ₹7.15/kVAh.")
]
for _ in range(60):
    for q, a in concepts:
        dataset.append([{"role": "system", "content": system_prompt}, {"role": "user", "content": q}, {"role": "assistant", "content": a}])

billing_q = ["Why is my electricity bill higher this month?", "Can you break down my recent cost?", "What drove up my energy charges?", "Explain the penalties in my current bill."]
for i in range(400):
    q = random.choice(billing_q)
    limit = 1501.0
    demand = random.randint(1201, 1800)
    total_kvah = random.randint(30000, 50000)
    peak_kvah = round(total_kvah * 0.25, 2)
    normal_kvah = round(total_kvah * 0.55, 2)
    off_peak_kvah = round(total_kvah * 0.20, 2)
    energy_charge = round((peak_kvah * 8.65) + (normal_kvah * 7.15) + (off_peak_kvah * 6.65), 2)
    
    billed_demand = max(demand, 1201.0)
    if demand <= 1501.0:
        normal_demand_charge = billed_demand * 500.0
        penal_demand_charge = 0.0
    else:
        normal_demand_charge = 1501.0 * 500.0
        penal_demand_charge = (demand - 1501.0) * 1000.0
        
    electricity_duty = round(total_kvah * 0.06, 2)
    customer_charges = 3500.0
    estimated_total_bill = round(energy_charge + normal_demand_charge + penal_demand_charge + electricity_duty + customer_charges, 2)

    a = (f"Your estimated total HT Cat 1A bill of ₹{estimated_total_bill:,} is calculated based on the TGSPDCL 33 kV active tariff. "
         f"This includes apparent energy charges of ₹{energy_charge:,} on {total_kvah:,} kVAh consumed, "
         f"normal demand charges of ₹{normal_demand_charge:,} (billed at {billed_demand:.1f} kVA), "
         f"penal demand charges of ₹{penal_demand_charge:,} for exceeding your 1501 kVA limit by {max(0.0, demand - 1501.0):.1f} kVA, "
         f"and ₹{electricity_duty + customer_charges:,} in taxes and customer charges.")

    db_payload = {
        "contracted_demand_kva": limit,
        "recorded_peak_md_kva": demand,
        "total_kvah": total_kvah,
        "tod_breakdown_kvah": {"peak": peak_kvah, "normal": normal_kvah, "off_peak": off_peak_kvah},
        "financial_breakdown_inr": {
            "energy_charge": energy_charge,
            "normal_demand_charge": normal_demand_charge,
            "demand_penalty": penal_demand_charge,
            "electricity_duty": electricity_duty,
            "customer_charges": customer_charges,
            "estimated_total_bill": estimated_total_bill
        }
    }
    
    dataset.append([{"role": "system", "content": system_prompt + f"\n\nDATABASE TOOL PAYLOAD:\n{json.dumps(db_payload)}"}, {"role": "user", "content": q}, {"role": "assistant", "content": a}])

anomaly_q = ["Are there any abnormalities in my electrical system?", "Did you detect any anomalies?", "Show me critical alerts.", "What is going wrong with my machines?"]
for i in range(400):
    q = random.choice(anomaly_q)
    meter = f"feeder_furnace_{random.randint(1,5)}"
    val = round(random.uniform(5.5, 12.0), 1)
    a = f"Yes, I detected a critical anomaly. There is a High Voltage THD event on `{meter}`. The recorded value spiked to {val}%, which exceeds the IEEE-519 safe limit of 5.0%. This is likely caused by non-linear loads and could overheat your transformers."
    db_payload = f'{{"anomalies": [{{"meter_id": "{meter}", "type": "High Voltage THD", "recorded_value": {val}, "limit_value": 5.0, "severity": "CRITICAL"}}]}}'
    dataset.append([{"role": "system", "content": system_prompt + f"\n\nDATABASE TOOL PAYLOAD:\n{db_payload}"}, {"role": "user", "content": q}, {"role": "assistant", "content": a}])

random.shuffle(dataset)
with open("dataset.jsonl", "w", encoding="utf-8") as f:
    for row in dataset:
        f.write(json.dumps({"messages": row}, ensure_ascii=False) + "\n")
print(f"Generated {len(dataset)} examples in dataset.jsonl")
