<div align="center">
  <b>README</b>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<a href="ARCHITECTURE.md">Architecture</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<a href="EVALUATION.md">Evaluation</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;<a href="SCALING_PLAN.md">Scaling Plan</a>
</div>
<br>

# Cortex Copilot - Industrial Intelligence Assistant

**[Live Frontend Demo](https://cortex-copilot-xyz.vercel.app/)**

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
- **The Process:** I ran a LoRA adaptation on a Google Colab T4 GPU instance, targeting all the linear layers. **[View the Unsloth Training Notebook](https://colab.research.google.com/drive/1UAw2rPq7EEmlg-uaZEPSgSlPywi3a7uc?usp=sharing)**
- **The Model Weights:** The training dataset, tokenizer configurations, and fine-tuned LoRA adapter configs are included directly in the `Fine_Tunned_Model/` directory of this repository for review.

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
- **Tenant A:** 1001 / cortex123
- **Tenant B:** 1002 / cortex123

## Deployment Note
Just a quick heads-up on the live link: The frontend is completely hosted on Vercel (**[https://cortex-copilot-xyz.vercel.app/](https://cortex-copilot-xyz.vercel.app/)**). 

To securely connect the Vercel frontend to the heavy local Python backend (which runs the fine-tuned LLM), the system uses a **Cloudflare Tunnel (`cloudflared`)**. This provides a secure, zero-trust connection that bypasses restrictive CORS preflight issues inherent to other tunneling solutions like Ngrok!
