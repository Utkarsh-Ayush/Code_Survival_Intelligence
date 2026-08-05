"""
Time-Travel AST Feature Extraction
====================================
Checks out specific commits from the git history, parses the Java files
as they existed at that moment, and extracts structural AST features.

This ensures AST features are temporally aligned with the survival labels:
  - For fault-inducing files: features at the FAULT_INDUCING_COMMIT
  - For censored files: features at their FIRST commit (earliest snapshot)

Usage:
    python src/ast_parser/time_travel_extract.py [--limit N]

Output:
    data/ast_features_timetraveled.csv
"""

import os
import sys
import csv
import sqlite3
import subprocess
import argparse
from pathlib import Path
from collections import defaultdict

import pandas as pd
import tree_sitter_java as tsjava
from tree_sitter import Language, Parser, Node

# ── Paths ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
REPOS_DIR = PROJECT_ROOT / "raw_repos"
DB_PATH = PROJECT_ROOT / "data" / "td_V2.db"
OUTPUT_CSV = PROJECT_ROOT / "data" / "ast_features_timetraveled.csv"

JAVA = Language(tsjava.language())
parser = Parser(JAVA)

# Map PROJECT_ID to repo folder name
REPO_MAP = {
    "org.apache:collections": "commons-collections",
    "org.apache:commons-io": "commons-io",
    "org.apache:vfs": "commons-vfs",
    "org.apache:ognl": "commons-ognl",
}

TARGET_PROJECTS = list(REPO_MAP.keys())


# ── AST Feature Extractors (reused from extract_features.py) ────────────────

def parse_bytes(source: bytes) -> Node | None:
    """Parse Java source bytes and return the root AST node."""
    try:
        tree = parser.parse(source)
        return tree.root_node
    except Exception:
        return None


def count_nodes(node: Node, target_type: str) -> int:
    count = 1 if node.type == target_type else 0
    for child in node.children:
        count += count_nodes(child, target_type)
    return count


def count_nodes_multi(node: Node, target_types: set) -> int:
    count = 1 if node.type in target_types else 0
    for child in node.children:
        count += count_nodes_multi(child, target_types)
    return count


def max_nesting_depth(node: Node, current_depth: int = 0) -> int:
    nesting_types = {
        "if_statement", "for_statement", "enhanced_for_statement",
        "while_statement", "do_statement", "switch_expression",
        "switch_block_statement_group", "try_statement",
    }
    is_nesting = node.type in nesting_types
    new_depth = current_depth + (1 if is_nesting else 0)
    max_depth = new_depth
    for child in node.children:
        child_depth = max_nesting_depth(child, new_depth)
        max_depth = max(max_depth, child_depth)
    return max_depth


def get_method_lengths(node: Node) -> list[int]:
    methods = []
    if node.type in ("method_declaration", "constructor_declaration"):
        methods.append(node.end_point[0] - node.start_point[0] + 1)
    for child in node.children:
        methods.extend(get_method_lengths(child))
    return methods


def count_empty_catch_blocks(node: Node) -> int:
    count = 0
    if node.type == "catch_clause":
        for child in node.children:
            if child.type == "block":
                meaningful = [c for c in child.children if c.type not in ("{", "}", "line_comment", "block_comment")]
                if len(meaningful) == 0:
                    count += 1
    for child in node.children:
        count += count_empty_catch_blocks(child)
    return count


def has_extends(node: Node) -> bool:
    if node.type == "superclass":
        return True
    return any(has_extends(child) for child in node.children)


def count_comments(source_bytes: bytes) -> int:
    lines = source_bytes.decode("utf-8", errors="replace").split("\n")
    count = 0
    in_block = False
    for line in lines:
        stripped = line.strip()
        if in_block:
            count += 1
            if "*/" in stripped:
                in_block = False
        elif stripped.startswith("//"):
            count += 1
        elif stripped.startswith("/*"):
            count += 1
            in_block = "*/" not in stripped
    return count


def extract_features_from_bytes(source_bytes: bytes) -> dict | None:
    """Extract all AST features from raw Java source bytes."""
    root = parse_bytes(source_bytes)
    if root is None:
        return None

    total_lines = source_bytes.count(b"\n") + 1
    method_lengths = get_method_lengths(root)
    num_methods = len(method_lengths)
    avg_method_len = sum(method_lengths) / num_methods if num_methods > 0 else 0
    max_method_len = max(method_lengths) if method_lengths else 0

    control_nodes = count_nodes_multi(root, {
        "if_statement", "for_statement", "enhanced_for_statement",
        "while_statement", "do_statement", "switch_expression",
    })
    comment_lines = count_comments(source_bytes)

    return {
        "total_lines": total_lines,
        "num_classes": count_nodes(root, "class_declaration"),
        "num_interfaces": count_nodes(root, "interface_declaration"),
        "num_methods": num_methods,
        "avg_method_length": round(avg_method_len, 2),
        "max_method_length": max_method_len,
        "max_nesting_depth": max_nesting_depth(root),
        "import_count": count_nodes(root, "import_declaration"),
        "object_creation_count": count_nodes(root, "object_creation_expression"),
        "has_inheritance": 1 if has_extends(root) else 0,
        "implements_count": count_nodes(root, "super_interfaces"),
        "empty_catch_blocks": count_empty_catch_blocks(root),
        "try_count": count_nodes(root, "try_statement"),
        "catch_count": count_nodes(root, "catch_clause"),
        "assert_count": count_nodes(root, "assert_statement"),
        "return_count": count_nodes(root, "return_statement"),
        "lambda_count": count_nodes(root, "lambda_expression"),
        "control_flow_count": control_nodes,
        "comment_lines": comment_lines,
        "comment_density": round(comment_lines / total_lines, 4) if total_lines > 0 else 0,
    }


# ── Git Operations ──────────────────────────────────────────────────────────

def git_ls_tree(repo_path: Path, commit_hash: str) -> dict[str, str]:
    """
    List all files at a given commit. Returns a dict mapping
    basename -> full_path (e.g., 'MapUtils.java' -> 'src/java/.../MapUtils.java').
    
    If multiple files share the same basename, the dict stores the last one found.
    We handle collisions by trying all matches in git_resolve_path.
    """
    try:
        result = subprocess.run(
            ["git", "ls-tree", "-r", "--name-only", commit_hash],
            cwd=repo_path, capture_output=True, timeout=15, text=True,
        )
        if result.returncode != 0:
            return {}
        
        # Build basename -> [full_paths] mapping
        mapping = {}
        for line in result.stdout.strip().split("\n"):
            if line.endswith(".java"):
                basename = line.rsplit("/", 1)[-1] if "/" in line else line
                # Store list of full paths per basename (handle duplicates)
                if basename not in mapping:
                    mapping[basename] = []
                mapping[basename].append(line)
        return mapping
    except (subprocess.TimeoutExpired, Exception):
        return {}


def git_show_file(repo_path: Path, commit_hash: str, file_path: str) -> bytes | None:
    """
    Get file contents at a specific commit WITHOUT checkout.
    Much faster than checkout for individual files.
    """
    try:
        result = subprocess.run(
            ["git", "show", f"{commit_hash}:{file_path}"],
            cwd=repo_path, capture_output=True, timeout=10,
        )
        if result.returncode == 0:
            return result.stdout
        return None
    except (subprocess.TimeoutExpired, Exception):
        return None


def git_restore_main(repo_path: Path):
    """Restore repo to main/master branch."""
    for branch in ["main", "master"]:
        try:
            subprocess.run(
                ["git", "checkout", branch, "--force", "--quiet"],
                cwd=repo_path, capture_output=True, timeout=10, check=True,
            )
            return
        except subprocess.CalledProcessError:
            continue


# ── Data Loading ────────────────────────────────────────────────────────────

def load_fault_targets(conn: sqlite3.Connection) -> pd.DataFrame:
    """
    Load fault-inducing commit + file pairs for our target projects.
    Each row = one (project, file, commit) that we need to parse.
    """
    query = f"""
        SELECT DISTINCT
            szz.PROJECT_ID,
            gcc.FILE,
            szz.FAULT_INDUCING_COMMIT_HASH AS COMMIT_HASH
        FROM SZZ_FAULT_INDUCING_COMMITS szz
        JOIN GIT_COMMITS_CHANGES gcc
            ON szz.PROJECT_ID = gcc.PROJECT_ID
            AND szz.FAULT_INDUCING_COMMIT_HASH = gcc.COMMIT_HASH
        WHERE szz.PROJECT_ID IN ({','.join('?' for _ in TARGET_PROJECTS)})
          AND gcc.FILE LIKE '%.java'
    """
    df = pd.read_sql(query, conn, params=TARGET_PROJECTS)
    df["LABEL"] = "fault"
    return df


def load_censored_targets(conn: sqlite3.Connection, fault_keys: set) -> pd.DataFrame:
    """
    Load first-commit + file pairs for censored (non-fault) files.
    """
    query = f"""
        SELECT PROJECT_ID, FILE, MIN(COMMIT_HASH) AS COMMIT_HASH
        FROM GIT_COMMITS_CHANGES
        WHERE PROJECT_ID IN ({','.join('?' for _ in TARGET_PROJECTS)})
          AND FILE LIKE '%.java'
        GROUP BY PROJECT_ID, FILE
    """
    df = pd.read_sql(query, conn, params=TARGET_PROJECTS)
    df["_key"] = df["PROJECT_ID"] + "|" + df["FILE"]
    df = df[~df["_key"].isin(fault_keys)].drop(columns=["_key"])
    df["LABEL"] = "censored"
    return df


# ── Main Pipeline ───────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description="Time-Travel AST Feature Extraction")
    ap.add_argument("--limit", type=int, default=0,
                     help="Max total files to process (0 = all)")
    args = ap.parse_args()

    print("=" * 60)
    print("TIME-TRAVEL AST FEATURE EXTRACTION")
    print("=" * 60)

    # Connect to database
    print(f"\nConnecting to: {DB_PATH}")
    conn = sqlite3.connect(str(DB_PATH))

    # Load targets
    print("\n[1/4] Loading fault-inducing targets...")
    fault_df = load_fault_targets(conn)
    print(f"  Fault (commit, file) pairs: {len(fault_df):,}")

    fault_keys = set(fault_df["PROJECT_ID"] + "|" + fault_df["FILE"])

    print("\n[2/4] Loading censored targets...")
    censored_df = load_censored_targets(conn, fault_keys)
    print(f"  Censored (commit, file) pairs: {len(censored_df):,}")
    conn.close()

    # Combine
    targets = pd.concat([fault_df, censored_df], ignore_index=True)
    print(f"\n  Total targets: {len(targets):,}")

    if args.limit > 0:
        targets = targets.head(args.limit)
        print(f"  Limited to: {len(targets):,}")

    # Group by (project, commit) for efficient git show
    grouped = defaultdict(list)
    for _, row in targets.iterrows():
        key = (row["PROJECT_ID"], row["COMMIT_HASH"])
        grouped[key].append((row["FILE"], row["LABEL"]))

    unique_commits = len(grouped)
    print(f"  Unique commits to query: {unique_commits:,}")

    # Process
    print(f"\n[3/4] Extracting AST features via git show...")
    print(f"  Strategy: git ls-tree per commit to resolve bare filenames")
    results = []
    processed = 0
    failed = 0
    ls_tree_cache = {}  # (repo_name, commit) -> basename_map

    for idx, ((project_id, commit_hash), file_list) in enumerate(grouped.items()):
        repo_name = REPO_MAP.get(project_id)
        if not repo_name:
            continue
        repo_path = REPOS_DIR / repo_name

        # Get file tree for this commit (cached)
        cache_key = (repo_name, commit_hash)
        if cache_key not in ls_tree_cache:
            ls_tree_cache[cache_key] = git_ls_tree(repo_path, commit_hash)
        basename_map = ls_tree_cache[cache_key]

        for db_filename, label in file_list:
            # Resolve bare filename to full git path(s)
            full_paths = basename_map.get(db_filename, [])
            
            if not full_paths:
                failed += 1
                continue

            # Try each matching full path (usually just one)
            parsed = False
            for full_path in full_paths:
                source = git_show_file(repo_path, commit_hash, full_path)
                if source is None:
                    continue

                features = extract_features_from_bytes(source)
                if features is None:
                    continue

                features["PROJECT_ID"] = project_id
                features["FILE"] = db_filename  # Keep DB filename for join
                features["FULL_PATH"] = full_path
                features["COMMIT_HASH"] = commit_hash
                features["LABEL"] = label
                results.append(features)
                processed += 1
                parsed = True
                break  # Take first successful match

            if not parsed:
                failed += 1

        # Progress
        if (idx + 1) % 100 == 0:
            print(f"  Commits processed: {idx+1}/{unique_commits}  "
                  f"Files parsed: {processed:,}  Failed: {failed}")

    print(f"\n  Final: {processed:,} files parsed, {failed} failed")

    # Write output
    if not results:
        print("\n[ERROR] No results! Exiting.")
        sys.exit(1)

    print(f"\n[4/4] Writing output...")
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(results[0].keys())
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)

    print(f"\n{'=' * 60}")
    print(f"TIME-TRAVEL AST EXTRACTION COMPLETE")
    print(f"{'=' * 60}")
    print(f"  Output: {OUTPUT_CSV}")
    print(f"  Rows:   {len(results):,}")
    print(f"  Features: {len(fieldnames) - 4} structural + 4 metadata")

    # Quick stats
    import statistics
    depths = [r["max_nesting_depth"] for r in results]
    methods = [r["num_methods"] for r in results]
    catches = [r["empty_catch_blocks"] for r in results]
    print(f"\n  Feature Highlights:")
    print(f"    Max nesting depth:   mean={statistics.mean(depths):.2f}  max={max(depths)}")
    print(f"    Methods per file:    mean={statistics.mean(methods):.1f}  max={max(methods)}")
    print(f"    Empty catch blocks:  total={sum(catches)}  files_with={sum(1 for c in catches if c > 0)}")

    # Restore repos to main
    for repo_name in REPO_MAP.values():
        git_restore_main(REPOS_DIR / repo_name)


if __name__ == "__main__":
    main()
