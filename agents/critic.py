from pathlib import Path

def prompt():
    log = Path("agent-logs/failures.md").read_text()
    return "Read AGENTS.md. Do not edit files. Propose one evidence-based improvement for human approval. Recent failures:\n" + "\n".join(log.split("\n### ")[-20:])[-24000:]
