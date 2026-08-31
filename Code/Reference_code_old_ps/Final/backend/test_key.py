import os
import requests
import json

API_KEY = os.environ.get("NVIDIA_API_KEY", "")
BASE_URL = "https://integrate.api.nvidia.com/v1"

def test_api():
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Accept": "application/json"
    }
    
    # 1. Test Listing Models
    print("--- Testing API Key (Listing Models) ---")
    try:
        response = requests.get(f"{BASE_URL}/models", headers=headers)
        if response.status_code == 200:
            print("Success! API Key is working.")
            models = response.json().get('data', [])
            print(f"Found {len(models)} models.")
            # Print a few models to check names
            for m in models[:10]:
                print(f" - {m['id']}")
        else:
            print(f"Error: Status Code {response.status_code}")
            print(response.text)
            return
    except Exception as e:
        print(f"Connection Error: {e}")
        return

    # 2. Test simple completion
    print("\n--- Testing Simple Completion ---")
    payload = {
        "model": "meta/llama-3.1-405b-instruct",
        "messages": [{"role": "user", "content": "Hello, are you there?"}],
        "max_tokens": 10
    }
    
    try:
        response = requests.post(f"{BASE_URL}/chat/completions", headers=headers, json=payload)
        if response.status_code == 200:
            print("Success! Completion working.")
            print(f"Response: {response.json()['choices'][0]['message']['content']}")
        else:
            print(f"Completion Error: Status Code {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Completion Connection Error: {e}")

if __name__ == "__main__":
    test_api()
