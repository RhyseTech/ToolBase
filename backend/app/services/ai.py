import os
import json
from groq import Groq

def get_groq_client():
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key or api_key == "dummy_key_to_prevent_startup_crash":
        # Check if dummy key is present in env, fallback
        pass
    return Groq(api_key=api_key)

def analyze_tool_content(url: str, content: str) -> dict:
    client = get_groq_client()
    prompt = f"""
You are an AI tool classification assistant.
Analyze the supplied website information from the URL: {url}.

Return ONLY valid JSON.
Required fields:
- name (string)
- description (string)
- purpose (string)
- category (string, pick one from: Search, Coding, Design, Image, Video, Audio, Voice, Writing, Research, Data, Productivity, Automation, Agents, Developer Tools, Education, Marketing, Business, Other)
- subcategory (string)
- use_cases (list of strings)
- features (list of strings)
- tags (list of short human-readable lowercase keywords, e.g. ["backend", "auth", "database"]; NEVER ids, hashes, codes, or model numbers)
- pricing (string)
- strengths (list of strings)
- limitations (list of strings)

Do not invent information. If information is unavailable, return null or an empty array.

Website content:
{content}
"""

    try:
        response = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant that strictly outputs JSON.",
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="openai/gpt-oss-20b",
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return {}
