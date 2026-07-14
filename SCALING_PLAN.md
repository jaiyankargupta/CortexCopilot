<div align="center">
  <a href="README.md">README</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<a href="ARCHITECTURE.md">Architecture</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<a href="EVALUATION.md">Evaluation</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<b>Scaling Plan</b>
</div>
<br>

# Production Scaling Plan

This document outlines the strategy to scale Cortex Copilot from a prototype into a highly robust, "fully trained" production intelligence layer for Vireon’s Industrial Intelligence Platform. 

To achieve a resilient, continuously improving model in production, we must close the loop between factory telemetry, user interactions, and model weights.

---

## 1. Data Pipeline: Real Telemetry to Training Data

Our goal is to build a flywheel where the model gets smarter every single day without manual engineering intervention.

### Streaming Telemetry Ingestion
Instead of parsing static Excel workbooks, the production environment will shift to a high-throughput architecture. 
- **Message Broker:** High-frequency electrical telemetry from smart meters will be pushed to **Kafka**.
- **Time-Series DB:** Data will be consumed by and stored in **TimescaleDB** (or similar optimized Postgres extension) for hyper-fast interval aggregations and anomaly queries.

### Automated QA Pair Generation (Self-Instruct)
The deterministic Analytics Engine we built for the prototype will be repurposed as a synthetic data generator. 
- A background cron job will scan the TimescaleDB for novel anomalies (e.g., a specific combination of Phase Imbalance and demand violation).
- When a novel event is found, the engine generates the hard math, and a larger "Teacher" model (e.g., Llama 3 70B running offline) will generate high-quality, perfectly grounded Question/Answer pairs describing that anomaly.
- This creates an ever-growing dataset of extremely accurate, domain-specific edge cases.

### User Feedback Loop
- The React UI will be updated to include **Thumbs Up / Thumbs Down** feedback on every Copilot response.
- Downvoted responses (and the context payload) will be routed to a dead-letter queue for human review. Once corrected, these become high-value training targets for the next epoch.

---

## 2. Retraining Cadence

A model that understands industrial telemetry must stay up-to-date with changing tariff structures (e.g., summer vs. winter ToD changes) and novel factory behavior.

- **Incremental QLoRA Fine-Tuning:** We will trigger an automated fine-tuning pipeline every **2 weeks**. 
- **The Dataset:** The training set will consist of:
  1. The original baseline dataset (to prevent catastrophic forgetting).
  2. The synthetic QA pairs generated from recent real-world anomalies.
  3. The corrected "Thumbs Down" queries from the past 14 days.
- **Compute:** This job can be orchestrated via an **Airflow DAG**, spinning up an ephemeral GPU node (e.g., A100 or 4x T4s on AWS/GCP) to run the LoRA adaptation over 3-4 hours, then destroying the node to save costs.

---

## 3. Evaluation Gates (CI/CD for Models)

Before a new LoRA adapter is promoted to production, it must pass a rigorous, automated CI/CD pipeline. A model regression in an industrial context could cost a factory manager millions of rupees if they act on bad advice.

1. **Deterministic Guardrail Tests:** The model will be tested against 500 hidden evaluation scenarios. If the model hallucinates a single metric or fails a Cortex Guard check, the deployment **fails instantly**.
2. **Refusal & Safety Benchmarks:** The model will be hit with 100 prompt-injection and out-of-domain questions (e.g., "Write a poem", "What is the data for Tenant X?"). It must successfully refuse 100% of these.
3. **LLM-as-a-Judge:** For the subjective quality of the narrative, the candidate model's outputs will be graded by a frozen, stronger offline model. If the narrative score drops below the current production baseline, the deployment is halted.

---

## 4. Deployment & Rollback Strategy

Once the model passes all evaluation gates, it will be deployed using a strict **Blue/Green** methodology.

- **Adapter Swapping:** Because we are using LoRA, we do not need to hot-load a massive 15GB base model. We keep the base model (e.g., Qwen 2.5 1.5B) continually loaded in GPU memory using **vLLM** or **Ollama**.
- **Routing:** The FastAPI Gateway routes 5% of traffic (Canary) to the new LoRA adapter. If error rates or latency spike, the router instantly shifts traffic back to the current version.
- **Instant Rollback:** Because the previous adapter weights remain on disk, if a critical hallucination is discovered in production, a platform admin can issue a 1-click rollback. The Gateway will immediately resume using the `v1.2` adapter instead of `v1.3` with zero downtime.

---

## 5. Summary
By combining TimescaleDB ingestion, synthetic self-instruct generation, automated two-week QLoRA training cycles, and strict deterministic evaluation gates, Vireon can confidently scale Cortex Copilot to thousands of factories while guaranteeing absolute data accuracy.
