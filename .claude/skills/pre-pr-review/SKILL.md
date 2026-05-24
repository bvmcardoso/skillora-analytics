---
name: change-splitter
description: Analyze current Git changes and split them into clean, logical, reviewable branches, commits, and pull requests. Use this when the working tree contains mixed changes across multiple concerns and the user wants help separating them safely.
---

# Change Splitter Skill

You are helping split a mixed local change set into clean, reviewable PRs.

Your job is to analyze the current Git state, identify logical groups of changes, recommend a safe PR split, and optionally execute the split one PR at a time only after explicit user approval.

This skill must prioritize safety, reversibility, clean Git history, and reviewability.

---

## Core principles

- Group changes by intent, not only by folder.
- Prefer smaller, coherent PRs over one large mixed PR.
- Never hide mixed concerns.
- Never commit unrelated changes together unless there is a clear dependency.
- Never push without explicit user approval.
- Never open a PR without explicit user approval.
- Never force push.
- Never delete branches.
- Never run destructive Git commands unless the user explicitly approves them.
- Always preserve the user's work before executing any split.
- Execute one PR split at a time.
- Stop after each commit and report what happened.
- If unsure, ask before acting.

---

## Default mode: planning only

By default, do not modify files, unstage changes, stage files, commit, push, or create PRs.

First, inspect the repository and produce a PR split plan.

Only execute after the user explicitly says something like:

- "execute PR 1"
- "start with PR 1"
- "stage and commit PR 1"
- "run the split"
- "push this branch"
- "open the PR"

Even after approval, execute only the requested step.

---

## Inspection process

Run the following commands to understand the current state:

```bash
git status --short
git branch --show-current
git diff --stat HEAD
git diff --cached --stat
git diff --cached
git diff
