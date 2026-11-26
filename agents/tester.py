import subprocess

def verify(timeout):
    results = []
    for command in (["npm", "run", "build"], ["npm", "test"], ["npm", "run", "test:smoke"], ["node", "scripts/verify-persistence.mjs"]):
        try:
            p = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
            results.append({"command": " ".join(command), "passed": p.returncode == 0, "log": (p.stdout + p.stderr)[-20000:]})
        except (OSError, subprocess.TimeoutExpired) as exc:
            results.append({"command": " ".join(command), "passed": False, "log": str(exc)})
    return results
