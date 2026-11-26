"""Run from repository root: python agents/orchestrator.py tasks/combat-reliability.md."""
import subprocess
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import TypedDict
import yaml
from langgraph.graph import StateGraph, START, END
import designer, implementer, tester, critic

cfg = yaml.safe_load(Path("agents/config.yaml").read_text())
class State(TypedDict):
    task: str
    spec: str
    feedback: str
    iteration: int
    passed: bool

def append(path, message):
    with Path(path).open("a") as f:
        f.write("\n### " + datetime.now(timezone.utc).isoformat() + "\n" + message + "\n")

def agent(prompt):
    p = subprocess.run(cfg["agent_command"], input=prompt, text=True, capture_output=True, timeout=cfg["timeout_seconds"])
    if p.returncode:
        raise RuntimeError(p.stderr[-12000:])
    if len(p.stdout) > cfg["max_output_chars"]:
        raise RuntimeError("Agent output limit exceeded")
    return p.stdout

def design(s):
    return {"spec": agent(designer.prompt(s["task"]))}

def implement(s):
    return {"iteration": s["iteration"] + 1, "feedback": agent(implementer.prompt(s["task"], s["spec"], s["feedback"]))}

def test(s):
    results = tester.verify(cfg["timeout_seconds"])
    passed = all(r["passed"] for r in results)
    report = "\n".join(str(r) for r in results)
    append("agent-logs/progress.md", f"Iteration {s['iteration']}: automated verification {passed}\n" + report)
    if not passed:
        append("agent-logs/failures.md", f"Task: {s['task']}\nIteration: {s['iteration']}\nAttempt: {s['feedback']}\nExact results: {report}\nRoot cause: pending diagnosis\nRetry: return evidence to implementer")
    return {"passed": passed, "feedback": report}

def reflect(s):
    append("agent-logs/progress.md", "Critic proposal (not applied):\n" + agent(critic.prompt()))
    return {}

def route(s):
    return "reflect" if s["passed"] or s["iteration"] >= min(6, cfg["max_iterations"]) else "implement"

def main():
    if not cfg["agent_command"]:
        raise SystemExit("Configure agent_command and enforce provider token/cost limits before running.")
    branch = subprocess.check_output(["git", "branch", "--show-current"], text=True).strip()
    if not branch or branch in ("main", "master", "gh-pages"):
        raise SystemExit("Use an isolated task branch.")
    if subprocess.check_output(["git", "status", "--porcelain"], text=True).strip():
        raise SystemExit("Start with a clean worktree.")
    graph = StateGraph(State)
    for name, fn in [("design", design), ("implement", implement), ("test", test), ("reflect", reflect)]:
        graph.add_node(name, fn)
    graph.add_edge(START, "design")
    graph.add_edge("design", "implement")
    graph.add_edge("implement", "test")
    graph.add_conditional_edges("test", route)
    graph.add_edge("reflect", END)
    task = Path(sys.argv[1]).read_text()
    try:
        result = graph.compile().invoke({"task": task, "spec": "", "feedback": "", "iteration": 0, "passed": False}, config={"recursion_limit": 25})
    except Exception as exc:
        append("agent-logs/failures.md", f"Task: {task}\nExact error: {exc!r}\nRoot cause: pending diagnosis\nRetry: stopped for human review")
        raise
    print("Automated checks passed; manual gameplay and human approval required." if result["passed"] else "Verification failed; escalate.")
    return 0 if result["passed"] else 1

if __name__ == "__main__":
    sys.exit(main())
