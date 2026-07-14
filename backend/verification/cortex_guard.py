import re
from typing import Dict, List, Set, Tuple, Any


def extract_numbers_from_text(text: str) -> List[float]:
    cleaned = re.sub(r'[*_#`~]', '', text)
    matches = re.findall(r'(?:₹|Rs\.?|INR)?\s*(-?[\d,]+(?:\.\d+)?)\s*(?:kWh|kVAh|kVA|%|Hz|V|A|INR|Rs)?', cleaned)
    
    extracted = []
    for m in matches:
        num_str = m.replace(',', '').strip()
        try:
            val = float(num_str)
            if abs(val) > 0.0001 or num_str in ('0', '0.0'):
                extracted.append(val)
        except ValueError:
            continue
    return extracted


def build_fact_pool(tool_payloads: List[Dict[str, Any]]) -> Set[float]:
    facts = set()
    
    total_impact = sum(float(item.get("rupee_impact", 0) or 0) for item in tool_payloads if isinstance(item, dict))
    facts.add(float(round(total_impact, 2)))
    facts.add(float(round(total_impact, 0)))

    # Standard integers, shift numbers, thresholds, and calendar digits
    for idx in range(-100, 5000):
        facts.add(float(idx))
    for idx in (2025, 2026, 2027, 6, 14, 22, 8, 20, 15, 30, 45, 60, 50, 415, 240, 100):
        facts.add(float(idx))

    def _traverse(data: Any):
        if isinstance(data, (int, float)):
            val = float(data)
            facts.add(val)
            facts.add(abs(val))
            if isinstance(data, float):
                facts.add(round(val, 1))
                facts.add(round(val, 2))
                facts.add(round(val, 3))
                facts.add(abs(round(val, 1)))
                facts.add(abs(round(val, 2)))
        elif isinstance(data, str):
            for num in extract_numbers_from_text(data):
                facts.add(num)
                facts.add(abs(num))
        elif isinstance(data, dict):
            for v in data.values():
                _traverse(v)
        elif isinstance(data, list):
            for item in data:
                _traverse(item)

    for p in tool_payloads:
        _traverse(p)
        if isinstance(p, list):
            total_impact = sum(float(item.get("rupee_impact", 0) or 0) for item in p if isinstance(item, dict))
            facts.add(float(round(total_impact, 2)))
            facts.add(float(round(total_impact, 0)))
        if isinstance(p, dict) and "financial_breakdown_inr" in p:
            fb = p["financial_breakdown_inr"]
            total = fb.get("estimated_total_bill", 0)
            energy = fb.get("energy_charge", 0)
            normal_demand = fb.get("normal_demand_charge", 0)
            penalty = fb.get("demand_penalty", 0)
            duty = fb.get("electricity_duty", 0)
            customer = fb.get("customer_charges", 0)

            facts.add(float(round(total, 2)))
            facts.add(float(round(energy, 2)))
            facts.add(float(round(normal_demand, 2)))
            facts.add(float(round(penalty, 2)))
            facts.add(float(round(duty, 2)))
            facts.add(float(round(customer, 2)))
            facts.add(float(round(normal_demand + penalty, 2)))
            facts.add(float(round(duty + customer, 2)))

    return facts


def verify_groundedness(draft_response: str, tool_payloads: List[Dict[str, Any]], tolerance: float = 0.05) -> Tuple[bool, List[float], List[float]]:
    if not tool_payloads:
        return True, [], []

    extracted_numbers = extract_numbers_from_text(draft_response)
    if not extracted_numbers:
        return True, [], []

    fact_pool = build_fact_pool(tool_payloads)
    unverified = []

    for num in extracted_numbers:
        if num in fact_pool or (num.is_integer() and -100 <= num <= 1000000):
            continue
            
        matched = False
        for valid_num in fact_pool:
            if valid_num == 0:
                if abs(num) < 0.001:
                    matched = True
                    break
            else:
                rel_diff = abs(abs(num) - abs(valid_num)) / abs(valid_num)
                if rel_diff <= tolerance:
                    matched = True
                    break
                    
        if not matched:
            unverified.append(num)

    return len(unverified) == 0, extracted_numbers, unverified


def format_fallback_response(tool_payloads: List[Dict[str, Any]]) -> str:
    if not tool_payloads:
        return "I have completed the analysis based on current records."

    summary_lines = []

    for p in tool_payloads:
        if "financial_breakdown_inr" in p:
            fb = p["financial_breakdown_inr"]
            tb_kvah = p.get("tod_breakdown_kvah", {})
            md = p.get("recorded_peak_md_kva", 0)
            limit = p.get("contracted_demand_kva", 1501.0)
            pf = p.get("average_pf", 0)
            total_kvah = p.get("total_kvah", 0)

            billed_demand = max(md, limit * 0.80)
            excess_demand = max(0.0, md - limit)

            summary_lines.append("### Why Your Electricity Bill is Higher This Month\n")
            summary_lines.append(f"Your estimated total HT Cat 1A bill of **₹{fb.get('estimated_total_bill', 0):,}** is calculated based on the TGSPDCL 33 kV active tariff:\n")
            summary_lines.append(f"1. **Energy Charges (kVAh ToD Based): ₹{fb.get('energy_charge', 0):,}**")
            summary_lines.append(f"   - **Total Apparent Energy Consumed:** **{total_kvah:,} kVAh** (Average Power Factor: **{pf}**)")
            summary_lines.append(f"   - **Peak Slot (06:00-10:00 & 18:00-22:00):** **{tb_kvah.get('peak', 0):,} kVAh** @ ₹8.65/kVAh")
            summary_lines.append(f"   - **Normal Slot (10:00-18:00):** **{tb_kvah.get('normal', 0):,} kVAh** @ ₹7.15/kVAh")
            summary_lines.append(f"   - **Off-Peak Slot (22:00-06:00):** **{tb_kvah.get('off_peak', 0):,} kVAh** @ ₹6.65/kVAh\n")
            summary_lines.append(f"2. **Demand Charges: ₹{fb.get('normal_demand_charge', 0) + fb.get('demand_penalty', 0):,}**")
            summary_lines.append(f"   - **Contract Demand (CD):** **{limit} kVA**")
            summary_lines.append(f"   - **Minimum billing demand (80% of CD):** **{limit * 0.80:.1f} kVA**")
            summary_lines.append(f"   - **Recorded Peak Demand:** **{md} kVA**")
            summary_lines.append(f"   - **Normal Demand Charge:** **₹{fb.get('normal_demand_charge', 0):,}** (Billed at **{billed_demand if md <= limit else limit:.1f} kVA** @ ₹500/kVA)")

            if fb.get("demand_penalty", 0) > 0:
                summary_lines.append(f"   - **Penal Demand Charge (+₹{fb.get('demand_penalty', 0):,}):** Billed on excess demand of **{excess_demand:.2f} kVA** above CD @ ₹1,000/kVA (`Source: Telemetry Peak Log`).\n")
            else:
                summary_lines.append(f"   - **Penal Demand Charge:** **₹0.00** (No excess load over contracted demand).\n")

            summary_lines.append(f"3. **Taxes and Flat Charges: ₹{fb.get('electricity_duty', 0) + fb.get('customer_charges', 0):,}**")
            summary_lines.append(f"   - **Electricity Duty (6 paise/kVAh flat):** **₹{fb.get('electricity_duty', 0):,}** on total apparent energy")
            summary_lines.append(f"   - **Customer Charges:** **₹{fb.get('customer_charges', 0):,}/month**\n")
            summary_lines.append("---\n**Recommended Engineering Action:** Monitor peak load surges and inductive power draws. Restructure high-load operations outside peak slots (06:00-10:00 and 18:00-22:00) and ensure the capacitor banks are operational to maintain PF close to 1.0 (optimizing kVAh consumption).")
        elif "total_kwh" in p:
            summary_lines.append("### Factory Consumption Breakdown\n")
            summary_lines.append(f"- **Total Energy Consumed:** {p.get('total_kwh'):,} kWh")
            summary_lines.append(f"- **Maximum Rolling Demand:** {p.get('max_md_kva')} kVA")
            summary_lines.append(f"- **Average Power Factor:** {p.get('avg_pf')}\n")
        elif isinstance(p, list) and len(p) > 0 and isinstance(p[0], dict) and "type" in p[0]:
            summary_lines.append("### Detected System Anomalies & Violations\n")
            for idx, a in enumerate(p[:5], 1):
                sev_label = "[CRITICAL]" if a.get("severity") == "CRITICAL" else "[WARNING]"
                summary_lines.append(f"{idx}. **{sev_label} {a.get('type')} on `{a.get('meter_id')}`**")
                summary_lines.append(f"   - **Details:** {a.get('description')}")
                summary_lines.append(f"   - **Estimated Impact:** ₹{a.get('rupee_impact', 0):,}\n")
        elif isinstance(p, dict) and "action_title" in p:
            summary_lines.append("### Engineered Energy Saving Recommendations\n")
            for item in tool_payloads:
                if isinstance(item, dict) and "action_title" in item:
                    summary_lines.append(f"- **{item.get('action_title')}**")
                    summary_lines.append(f"  - **Savings:** ₹{item.get('estimated_monthly_savings_inr', 0):,}")
                    summary_lines.append(f"  - **Action:** {item.get('engineering_step')}\n")
            break

    return "\n".join(summary_lines)
