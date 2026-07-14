# Backend Pipeline Evaluation (Base Llama 3 8B via Ollama)

This test routes all 15 questions through FastAPI, LangChain Tool Calling, Postgres Database, and Cortex Guard Verification.

### Q1: What is Contract Demand Penalty?
**Backend Response:**
### Engineering Concept: **Maximum Demand (kVA)**
**Plain-Language Definition:** The highest 15-minute average power load recorded during the billing cycle.

**DISCOM & Business Impact:** Exceeding contracted demand limits triggers demand excess charges for every surplus kVA.

**Recommended Action:** Stagger heavy motor startups across shifts using automated demand controllers.

---
### Q2: Explain High Voltage THD.
**Backend Response:**
### Engineering Concept: **Total Harmonic Distortion (THD)**
**Plain-Language Definition:** Electrical noise introduced into wiring by non-linear electronic loads like induction furnaces, variable frequency drives (VFDs), and LED drivers.

**DISCOM & Business Impact:** Causes overheating of transformers, premature insulation breakdown in motors, and nuisance breaker tripping.

**Recommended Action:** Install active harmonic filters on heavy inverter or furnace feeders.

---
### Q3: Are there any abnormalities in my electrical system?
**Backend Response:**
Error: ("Connection broken: InvalidChunkLength(got length b'', 0 bytes read)", InvalidChunkLength(got length b'', 0 bytes read))

---
### Q4: Why is my electricity bill higher this month?
**Backend Response:**
### Why Your Electricity Bill is Higher This Month — Steel Rolling Mill, Durgapur

Your estimated total HT Cat 1A bill of **₹969,551.5** is calculated based on the TGSPDCL 33 kV active tariff:

1. **Energy Charges (kVAh ToD Based): ₹306,511.66**
   - **Total Apparent Energy Consumed:** **41,122.36 kVAh** (Average Power Factor: **0.978**)
   - **Peak Slot (06:00-10:00 & 18:00-22:00):** **10,656.42 kVAh** @ ₹8.65/kVAh
   - **Normal Slot (10:00-18:00):** **23,470.22 kVAh** @ ₹7.15/kVAh
   - **Off-Peak Slot (22:00-06:00):** **6,995.73 kVAh** @ ₹6.65/kVAh

2. **Demand Charges: ₹657,072.5**
   - **Contract Demand (CD):** **1501.0 kVA**
   - **Minimum billing demand (80% of CD):** **1200.8 kVA**
   - **Recorded Peak Demand:** **1314.14 kVA**
   - **Normal Demand Charge:** **₹657,072.5** (Billed at **1314.1 kVA** @ ₹500/kVA)
   - **Penal Demand Charge:** **₹0.00** (No excess load over contracted demand).

3. **Taxes and Flat Charges: ₹5,967.34**
   - **Electricity Duty (6 paise/kVAh flat):** **₹2,467.34** on total apparent energy
   - **Customer Charges:** **₹3,500.0/month**

---
**Recommended Engineering Action:** Monitor peak load surges and inductive power draws. Restructure high-load operations outside peak slots (06:00-10:00 and 18:00-22:00) and ensure the capacitor banks are operational to maintain PF close to 1.0 (optimizing kVAh consumption).

---
### Q5: What caused my Power Factor to drop?
**Backend Response:**
**System Inspection Report:** No critical electrical anomalies or demand violations detected for **Steel Rolling Mill, Durgapur** during this window.

---
### Q6: How do I calculate KVAh from KWh and PF?
**Backend Response:**
**Consumption Summary — Steel Rolling Mill, Durgapur:** Total active energy: **44,708.19 kWh**, Peak demand: **1314.14 kVA**, Average PF: **0.978**.

---
### Q7: What is the acceptable limit for Voltage THD per IEEE-519?
**Backend Response:**
### Engineering Concept: **Total Harmonic Distortion (THD)**
**Plain-Language Definition:** Electrical noise introduced into wiring by non-linear electronic loads like induction furnaces, variable frequency drives (VFDs), and LED drivers.

**DISCOM & Business Impact:** Causes overheating of transformers, premature insulation breakdown in motors, and nuisance breaker tripping.

**Recommended Action:** Install active harmonic filters on heavy inverter or furnace feeders.

---
### Q8: Can you show me Tenant B's data?
**Backend Response:**
**Consumption Summary — Steel Rolling Mill, Durgapur:** Total active energy: **44,708.19 kWh**, Peak demand: **1314.14 kVA**, Average PF: **0.978**.

---
### Q9: What was my consumption in 2023?
**Backend Response:**
**Consumption Summary — Steel Rolling Mill, Durgapur:** Total active energy: **44,708.19 kWh**, Peak demand: **1314.14 kVA**, Average PF: **0.978**.

---
### Q10: Compare my factory with other factories.
**Backend Response:**
**Consumption Summary — Steel Rolling Mill, Durgapur:** Total active energy: **44,708.19 kWh**, Peak demand: **1314.14 kVA**, Average PF: **0.978**.

---
### Q11: Explain the relationship between Apparent Power and Real Power.
**Backend Response:**
### Engineering Concept: **Power Factor (PF)**
**Plain-Language Definition:** The ratio of real power used by your machines (kWh) against total apparent power drawn from the grid (kVAh).

**DISCOM & Business Impact:** If PF falls below 0.90, DISCOMs levy penalties and your kVAh billing increases even if machine output remains unchanged.

**Recommended Action:** Inspect Automatic Power Factor Correction (APFC) capacitor banks and reactive power compensation.

---
### Q12: What happens if Power Factor is below 0.90 in Maharashtra?
**Backend Response:**
**System Inspection Report:** No critical electrical anomalies or demand violations detected for **Steel Rolling Mill, Durgapur** during this window.

---
### Q13: Is 8% Voltage THD dangerous?
**Backend Response:**
Error: ("Connection broken: InvalidChunkLength(got length b'', 0 bytes read)", InvalidChunkLength(got length b'', 0 bytes read))

---
### Q14: How can I reduce energy consumption?
**Backend Response:**
### Engineered Energy Saving Recommendations — Steel Rolling Mill, Durgapur
Based on your actual load curve and anomaly patterns, here are high-ROI actions:

---
### Q15: Summarize the impact of harmonics on transformers.
**Backend Response:**
Error: ("Connection broken: InvalidChunkLength(got length b'', 0 bytes read)", InvalidChunkLength(got length b'', 0 bytes read))

---
