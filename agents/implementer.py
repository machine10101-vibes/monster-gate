def prompt(task, spec, feedback):
    return ("Read AGENTS.md. Work only on the current task branch. Do not commit, merge, deploy, change tests to hide failures, or access production data. Implement the smallest fix.\nTask: " + task + "\nSpec: " + spec + "\nTester feedback: " + feedback)
