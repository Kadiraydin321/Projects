#!/usr/bin/env python3
"""
Streaming Ollama Bridge for MoonNovel Autonomous Agent System
Handles long-running code generation with stream=True to prevent timeouts.
"""

import sys
import json
import urllib.request
import urllib.error

OLLAMA_HOST = "http://192.168.240.1:11434"
DEFAULT_MODEL = "qwen3-coder:30b"

def query_ollama_stream(prompt: str, model: str = DEFAULT_MODEL, system_prompt: str = "") -> str:
    url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": True,
        "options": {
            "num_predict": 4096,
            "temperature": 0.2
        }
    }
    if system_prompt:
        payload["system"] = system_prompt

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"}
    )

    full_response = []
    try:
        with urllib.request.urlopen(req, timeout=360) as response:
            for line in response:
                if line:
                    decoded = line.decode("utf-8").strip()
                    if not decoded:
                        continue
                    try:
                        chunk = json.loads(decoded)
                        part = chunk.get("response", "")
                        full_response.append(part)
                        sys.stdout.write(part)
                        sys.stdout.flush()
                        if chunk.get("done", False):
                            break
                    except json.JSONDecodeError:
                        continue
        return "".join(full_response)
    except Exception as e:
        sys.stderr.write(f"\nERROR: Ollama çağrısı başarısız: {str(e)}\n")
        return "".join(full_response)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanım: python3 ollama_bridge.py <prompt_file_or_string> [model]")
        sys.exit(1)
    
    arg = sys.argv[1]
    import os
    if os.path.isfile(arg):
        with open(arg, "r", encoding="utf-8") as f:
            prompt_content = f.read()
    else:
        prompt_content = arg

    model_arg = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL
    query_ollama_stream(prompt_content, model=model_arg)
