# Evaluation Report

To figure out which model would work best for Cortex Copilot and whether fine-tuning actually made a difference, I set up a local benchmark to test the system.

## How I Tested It
I wrote a custom Python evaluation script (`backend/eval/eval_llama_backend.py`) and sent a strict set of 15 canonical questions to the backend API. 

I was looking to test four main things:
1. **Retrieval Accuracy:** Could it pull the exact consumption and peak demand numbers?
2. **Domain Knowledge:** Could it explain complex stuff like THD, PF, and kVAh in a way a factory owner would actually understand?
3. **Refusal Behavior:** Would it refuse to answer questions about 2023 (since we don't have that data) or about a competitor's factory?
4. **Actionable Advice:** Did it actually suggest real engineering actions based on the anomalies?

Every response went through the Cortex Guard verification layer to ensure no numbers were hallucinated.

---

## 1. Choosing the Model
I tested the two best open-weight models that could reasonably run on standard hardware: **Llama 3 (8B)** and **Qwen 2.5 (1.5B)**.

Here is how they stacked up:

| Question | Qwen 2.5 (1.5B) | Llama 3 (8B) | Verdict |
|---|---|---|---|
| Q3: Are there abnormalities? | Passed (Correctly found the 814 THD events) | Failed (Stream crashed with `InvalidChunkLength`) | Qwen wins |
| Q4: Explain my bill | Passed (Gave a full HT Cat 1A breakdown) | Passed | Tie |
| Q8: Show Tenant B's data | Passed (Refused to show it) | Passed (Refused to show it) | Tie |
| Q13: Is 8% THD dangerous? | Passed (Compared it perfectly to IEEE-519 limits) | Failed (Stream crashed) | Qwen wins |

**My Conclusion:** I had to go with Qwen 2.5 (1.5B). While Llama 3 is a fantastic model, it actually failed 3 out of the 15 queries. The problem was that when the analytics engine passed it the massive report of 814 anomalies, Llama 3 took too long to generate the narrative, which caused the SSE stream to time out and crash. Qwen 2.5 is much smaller, streams significantly faster, and gave me 100% response coverage without crashing.

---

## 2. Base vs. Fine-Tuned Comparison
Once I settled on Qwen 2.5, I wanted to see if fine-tuning it on my custom domain dataset actually helped. I recorded the base model's score, injected my 300 Q/A dataset via LoRA on Colab, and ran the test again.

### The Numbers
- **Base Model Score:** 55.4% 
- **Fine-Tuned Model Score:** 89.2%

### What actually changed?
**Before Fine-Tuning (The Base Model):**
- **It was too generic:** When I asked about "ToD" (Time of Day tariffs), the base model would just give a textbook definition. It didn't realize it needed to apply the specific ₹8.65/kVAh peak rates that Indian DISCOMs use.
- **It missed the urgency:** When asked about THD, it explained what harmonics were but completely failed to mention the massive ₹1,221,000 rupee exposure that was literally sitting in its context window.

**After Fine-Tuning:**
- **It sounded like an engineer:** The model successfully adopted the persona of a Chief Electrical Engineer. It stopped trying to be a generic "helpful assistant."
- **It respected the data:** When I asked "Why is my bill higher?", it immediately broke the answer down into Energy Charges, Demand Penalties, and PF Incentives, pulling the exact rupee amounts straight from the JSON payload.
- **It became strict on isolation:** When asked "Compare me to other factories", the base model tried to make up some generic industry averages. The fine-tuned model immediately shut it down, stating: *"I am scoped exclusively to Tenant A and cannot access external factory data."*
