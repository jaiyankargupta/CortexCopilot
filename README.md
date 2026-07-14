<div align="center">
  <b>README</b>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<a href="ARCHITECTURE.md">Architecture</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<a href="EVALUATION.md">Evaluation</a>
</div>
<br>

# Cortex Copilot - Industrial Intelligence Assistant

Hey there, This is my submission for the Cortex Copilot Engineering Challenge. 

I built a secure, multi-tenant AI assistant designed to take raw factory electrical telemetry and translate it into plain-language insights for plant managers. Because the users are business owners and not electrical engineers, I needed to make sure the assistant never made up numbers. To solve this, I paired a fine-tuned LLM with a hardcoded, deterministic analytics engine. 

If you want to see how the system is built and how I prevent hallucinations, check out [ARCHITECTURE.md](ARCHITECTURE.md). For my model benchmarking and fine-tuning results, take a look at [EVALUATION.md](EVALUATION.md).

## Why I Chose Qwen 2.5 (1.5B)
I initially tested both Llama 3 (8B) and Qwen 2.5 (1.5B) locally using Ollama. 

While Llama 3 gave great narrative answers, I ran into a major issue during the heavy anomaly queries. When the analytics engine found hundreds of THD (Total Harmonic Distortion) events, the context payload became huge. Llama 3's generation latency caused the SSE (Server-Sent Events) stream to time out, throwing `InvalidChunkLength` errors and crashing the response.

I ultimately went with Qwen 2.5 (1.5B) because it's lightweight enough to run in a 4-bit quantized footprint (using less than 1.5GB of RAM), it streams extremely fast, and it successfully answered all 15 evaluation queries without a single stream crash.

## Fine-Tuning the Model
To get the model to understand Indian tariff logic and DISCOM terminology, I did some fine-tuning:
- **The Dataset:** I generated a custom instruction dataset (`dataset.jsonl`) with over 300 Q/A pairs covering time-of-day tariffs, power factor penalties, IEEE-519 standards, and strict refusal cases.
- **The Process:** I ran a LoRA adaptation on a Google Colab T4 GPU instance, targeting all the linear layers.

## What the System Found in the Data
While building the analytics engine, I ran it against the provided mock workbook and found a few major issues hidden in the data:

1. **Massive Harmonic Distortion on `feeder_furnace_01`:** 
   - The engine caught 814 intervals where the Voltage THD hit 9.54% and Current THD hit 28.24%. This is way over the safe IEEE-519 limits (which are usually 5% and 8% respectively).
   - This translates to an estimated financial exposure of about ₹1,221,000. It's likely caused by VFDs on the furnace running without active harmonic filters.
2. **Power Factor Drops:**
   - I also noticed the power factor consistently dropping below 0.90 during specific shifts, which directly increases the kVAh billing and loses the factory their PF incentives.

## Multi-Tenancy & Isolation
To prove that tenants can't access each other's data, I derived a second tenant from the provided mock data. 
- **Tenant A (Steel Rolling Mill):** Uses the raw mock dataset.
- **Tenant B (Textile Unit):** I derived this by shifting the timestamps, scaling the energy usage down by 40%, renaming the machine groups (e.g., Air Compressors instead of Furnaces), and changing the tariff to match Tamil Nadu HT rates.

If you want to test the isolation yourself, you can log in with:
- **Tenant A:** admin_a@tenant.com / password123
- **Tenant B:** admin_b@tenant.com / password123

## Deployment Note
Just a quick heads-up on the live link: Hugging Face very recently changed their pricing model and completely removed their free Docker compute tier. Because my personal laptop doesn't have the memory to host the fine-tuned LLM 24/7, I've had to get creative.

Right now, the frontend is deployed on Vercel, but the backend and the Ollama model are running via a tunneled Google Colab instance using Ngrok. Colab instances automatically die after 12 hours, so if the link is down when you are grading this, please check out my demo video to see it working, or just shoot me an email and I'll spin the server back up in 60 seconds!

## What I'd Do With Two More Weeks
If I had more time to take this to a production Tier 4 level, here is my scaling plan:
1. **Real-Time Ingestion:** I'd drop the Excel parser and wire up a Kafka + TimescaleDB pipeline for streaming telemetry.
2. **Automated Retraining:** I'd add a thumbs up/down button in the UI, save that feedback to Postgres, and use an Airflow DAG to automatically trigger incremental QLoRA fine-tuning every week on the queries the model struggled with.
3. **Advanced RAG:** I would integrate PGVector to allow the Copilot to pull specific clauses directly from massive PDF tariff documents.
