# Task: Expand AST Parser to 4 Repos to Fix Overfitting

## Background & Problem

We built a **time-travel AST feature extractor** that parses Java source code at historical commit points using Tree-sitter, then feeds those structural features into a Cox Proportional Hazards survival model.

**Current state:**
- AST features were extracted for only **2 repos** (`commons-collections`, `commons-io`)
- After merging with the training set, we only had **1,778 rows** for the combined model
- Result: the combined model **improved training C-index** (0.694 → 0.701) but **test C-index was flat** (0.669 → 0.666)
- This is a classic sign of **overfitting due to insufficient data**

**Your task:**
Add **2 more repos** (`commons-vfs` and `ognl`) to increase the merged dataset size, retrain the model, and see if the test C-index improves.

---

## Step-by-Step Instructions

### 1. Clone the repository

```bash
git clone https://github.com/Chiron-R/code-survival-intelligence.git
cd code-survival-intelligence
```

### 2. Set up the environment

```bash
python -m venv .venv

# Windows:
.venv\Scripts\activate

# Linux/Mac:
# source .venv/bin/activate

pip install -r requirements.txt
pip install tree-sitter tree-sitter-java
```

### 3. Download the dataset

You need the SQLite database file `td_V2.db` (~1.5GB). Download it from:
https://github.com/clowee/The-Technical-Debt-Dataset/releases

Place it at: `data/td_V2.db`

### 4. Create a new branch

```bash
git checkout -b feat/expand-ast-4-repos
```

### 5. Clone the 2 additional Apache repos

```bash
# These 2 are already done (you DON'T need to re-clone them, 
# but they must exist for the script to work):
git clone https://github.com/apache/commons-collections.git raw_repos/commons-collections
git clone https://github.com/apache/commons-io.git raw_repos/commons-io

# These 2 are NEW — you need to add them:
git clone https://github.com/apache/commons-vfs.git raw_repos/commons-vfs
git clone https://github.com/apache/ognl.git raw_repos/commons-ognl
```

> **Note on ognl:** The Apache OGNL repo might be at `https://github.com/apache/commons-ognl.git` or `https://github.com/jkuhnert/ognl.git`. If one URL fails, try the other. You can also search GitHub for "apache ognl" to find the correct repo.

### 6. Modify the time-travel extraction script

**File to edit:** `src/ast_parser/time_travel_extract.py`

Find the `REPO_MAP` dictionary (around line 41-44) and add the 2 new repos:

```python
# BEFORE (current):
REPO_MAP = {
    "org.apache:collections": "commons-collections",
    "org.apache:commons-io": "commons-io",
}

# AFTER (your change):
REPO_MAP = {
    "org.apache:collections": "commons-collections",
    "org.apache:commons-io": "commons-io",
    "org.apache:vfs": "commons-vfs",
    "org.apache:ognl": "commons-ognl",
}
```

That's it for this file — the rest of the code automatically handles any repos in REPO_MAP.

### 7. Run the time-travel AST extraction

```bash
python src/ast_parser/time_travel_extract.py
```

This will take approximately **10-15 minutes**. It will:
1. Query the `td_V2.db` database for fault-inducing commit hashes for all 4 repos
2. Use `git show` to retrieve each Java file at that historical commit
3. Parse the file with Tree-sitter and extract 20 structural features
4. Save everything to `data/ast_features_timetraveled.csv`

**Expected output:** You should see something like:
```
Total targets: ~12,000+
Files parsed: ~11,000+ (should be higher than the previous 8,073)
```

If any repo fails to parse (e.g., wrong clone URL for ognl), the script will show failures for that repo. Fix the clone URL and re-run.

### 8. Modify the integration script

**File to edit:** `src/models/ast_integration.py`

No code changes needed! The script automatically reads `ast_features_timetraveled.csv` and merges with the training set. Just run it:

```bash
python src/models/ast_integration.py
```

**What to look for in the output:**

```
Merged rows: XXXX (inner join)    <-- This should be HIGHER than 1,778
```

And most importantly:
```
RESULTS: C-INDEX COMPARISON
  Model                          Train     Test
  A: Original (DB metrics)      0.XXXX   0.XXXX
  B: AST only                   0.XXXX   0.XXXX
  C: Combined (DB + AST)        0.XXXX   0.XXXX

  Improvement (C vs A, test): +0.XXXX
```

**We want:** The "Improvement" line to be **positive** (i.e., `+0.0XXX` instead of `-0.0031`).

### 9. (Optional) Update the baseline AST extraction too

**File to edit:** `src/ast_parser/extract_features.py`

In the `main()` function, update the `--repo` argument choices and the repos list logic to also support `commons-vfs` and `commons-ognl`. This is optional but keeps things consistent.

### 10. Commit your changes

```bash
git add src/ast_parser/time_travel_extract.py
git add src/models/ast_integration.py          # only if you edited it
git add src/ast_parser/extract_features.py     # only if you edited it
git add results/ast_integration_comparison.csv
git add results/ast_integration_comparison.png

git commit -m "feat: expand AST extraction to 4 repos (vfs + ognl) to reduce overfitting

- Added commons-vfs and ognl to REPO_MAP in time_travel_extract.py
- Increased merged dataset from 1,778 to XXXX rows
- Test C-index improvement: XXXX (update with your actual numbers)"
```

### 11. Push your branch and create a Pull Request

```bash
git push origin feat/expand-ast-4-repos
```

Then go to: https://github.com/Chiron-R/code-survival-intelligence/pulls

Click **"New Pull Request"**, select your branch `feat/expand-ast-4-repos`, and create the PR.

In the PR description, include:
1. The before/after C-index comparison table
2. How many merged rows you got (old: 1,778 vs new: ???)
3. Whether the test C-index improved
4. Screenshot of the new `ast_integration_comparison.png` plot

---

## Quick Reference

### Project IDs in the database → Repo names

| `PROJECT_ID` in td_V2.db | GitHub Repo | Risk Rank |
|---|---|---|
| `org.apache:collections` | apache/commons-collections | #1 (17 files in top 50) |
| `org.apache:commons-io` | apache/commons-io | #2 (13 files) |
| `org.apache:vfs` | apache/commons-vfs | #3 (10 files) — **NEW** |
| `org.apache:ognl` | apache/commons-ognl (or jkuhnert/ognl) | #4 (5 files) — **NEW** |

### Key files you'll touch

| File | What to change |
|---|---|
| `src/ast_parser/time_travel_extract.py` | Add 2 entries to `REPO_MAP` dict |
| `src/ast_parser/extract_features.py` | (Optional) Add repo choices |

### Expected timeline
- Setup + cloning: ~10 min
- Time-travel extraction: ~15 min
- Integration run: ~2 min
- Commit + PR: ~5 min
- **Total: ~30 min**

---

## Troubleshooting

**"git show returned 0 files parsed"** for a new repo
→ The PROJECT_ID in the database doesn't match what you put in REPO_MAP. Run this to check:
```bash
python -c "import sqlite3; conn=sqlite3.connect('data/td_V2.db'); [print(r[0]) for r in conn.execute('SELECT DISTINCT PROJECT_ID FROM SZZ_FAULT_INDUCING_COMMITS ORDER BY PROJECT_ID')]"
```
Find the exact PROJECT_ID string and use that as the key in REPO_MAP.

**Clone URL doesn't work for ognl**
→ Try these alternatives:
```bash
git clone https://github.com/apache/commons-ognl.git raw_repos/commons-ognl
# or
git clone https://github.com/jkuhnert/ognl.git raw_repos/commons-ognl
```

**"ModuleNotFoundError: No module named 'tree_sitter_java'"**
→ Run: `pip install tree-sitter tree-sitter-java`

**Merged rows are still low**
→ The inner join matches on (PROJECT_ID, FILE). If the FILE column in the database uses bare filenames (e.g., `MapUtils.java`) but the AST output has full paths, the join will fail. The current code already handles this — check the `FILE` column in both CSVs to debug.
