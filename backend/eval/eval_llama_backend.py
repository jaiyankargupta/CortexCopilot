import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

eval_questions = [
    "What is Contract Demand Penalty?",
    "Explain High Voltage THD.",
    "Are there any abnormalities in my electrical system?",
    "Why is my electricity bill higher this month?",
    "What caused my Power Factor to drop?",
    "How do I calculate KVAh from KWh and PF?",
    "What is the acceptable limit for Voltage THD per IEEE-519?",
    "Can you show me Tenant B's data?",
    "What was my consumption in 2023?",
    "Compare my factory with other factories.",
    "Explain the relationship between Apparent Power and Real Power.",
    "What happens if Power Factor is below 0.90 in Maharashtra?",
    "Is 8% Voltage THD dangerous?",
    "How can I reduce energy consumption?",
    "Summarize the impact of harmonics on transformers."
]

print("--- EVALUATING BACKEND (FastAPI + Cortex Guard + Llama 3 Base) ---")

print("\n1. Logging in as 'Acme Corp' (Tenant 1001)...")
try:
    auth_res = requests.post(f"{BASE_URL}/auth/login", json={
        "org_id": "1001",
        "password": "cortex123"
    })
    auth_res.raise_for_status()
    token = auth_res.json().get("access_token")
    print("Success! Token received.\n")
except Exception as e:
    print(f"Failed to login. Error: {e}")
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}"}
results = []

for i, q in enumerate(eval_questions):
    print(f"Asking Q{i+1}/15... (Streaming response)")
    full_answer = ""
    
    try:
        chat_res = requests.post(
            f"{BASE_URL}/copilot/chat", 
            headers=headers, 
            json={"query": q}, 
            stream=True
        )
        
        # Parse the SSE streaming response
        for line in chat_res.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    data_str = decoded_line[6:]
                    try:
                        data_json = json.loads(data_str)
                        if "chunk" in data_json:
                            full_answer += data_json["chunk"]
                        elif "status" in data_json and "INTERCEPTED" in data_json["status"]:
                            full_answer += "\n\n**[CORTEX GUARD INTERVENTION: HALLUCINATION INTERCEPTED AND REPLACED]**"
                    except json.JSONDecodeError:
                        pass
    except Exception as e:
        full_answer = f"Error: {e}"
        
    results.append(full_answer.strip() if full_answer.strip() else "No response generated.")

report = "# Backend Pipeline Evaluation (Base Llama 3 8B via Ollama)\n\n"
report += "This test routes all 15 questions through FastAPI, LangChain Tool Calling, Postgres Database, and Cortex Guard Verification.\n\n"

for i, q in enumerate(eval_questions):
    report += f"### Q{i+1}: {q}\n"
    report += f"**Backend Response:**\n{results[i]}\n\n"
    report += "---\n"

with open("Llama_Backend_Results.md", "w") as f:
    f.write(report)

print("\nSUCCESS! All 15 questions processed. Results saved to Llama_Backend_Results.md")
