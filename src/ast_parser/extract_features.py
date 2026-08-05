"""
AST Feature Extraction using Tree-sitter
==========================================
Parses Java source files and extracts structural features that SonarQube
cannot capture, including:
  - Method count and average method length
  - Maximum nesting depth (if/for/while/try)
  - Class coupling (import count, object instantiation count)
  - Exception handling quality (empty catch blocks)
  - Inheritance depth signals (extends/implements)
  - Code structure ratios (comment density, assertion density)

Usage:
    python src/ast_parser/extract_features.py [--repo commons-collections|commons-io] [--limit N]

Output:
    data/ast_features.csv
"""

import os
import sys
import csv
import argparse
from pathlib import Path

import tree_sitter_java as tsjava
from tree_sitter import Language, Parser, Node

# ── Setup ────────────────────────────────────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
REPOS_DIR = PROJECT_ROOT / "raw_repos"
OUTPUT_CSV = PROJECT_ROOT / "data" / "ast_features.csv"

JAVA = Language(tsjava.language())
parser = Parser(JAVA)


# ── AST Feature Extractors ──────────────────────────────────────────────────

def parse_file(filepath: Path) -> Node | None:
    """Parse a Java file and return the root AST node."""
    try:
        source = filepath.read_bytes()
        tree = parser.parse(source)
        return tree.root_node
    except Exception as e:
        print(f"  [WARN] Failed to parse {filepath.name}: {e}")
        return None


def count_nodes(node: Node, target_type: str) -> int:
    """Recursively count nodes of a specific type."""
    count = 1 if node.type == target_type else 0
    for child in node.children:
        count += count_nodes(child, target_type)
    return count


def count_nodes_multi(node: Node, target_types: set) -> int:
    """Recursively count nodes matching any of the target types."""
    count = 1 if node.type in target_types else 0
    for child in node.children:
        count += count_nodes_multi(child, target_types)
    return count


def max_nesting_depth(node: Node, current_depth: int = 0) -> int:
    """
    Calculate the maximum nesting depth of control flow structures.
    Tracks: if, for, while, do, switch, try, enhanced_for.
    """
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
    """
    Find all method declarations and return their line lengths.
    """
    methods = []
    
    if node.type in ("method_declaration", "constructor_declaration"):
        start_line = node.start_point[0]
        end_line = node.end_point[0]
        methods.append(end_line - start_line + 1)
    
    for child in node.children:
        methods.extend(get_method_lengths(child))
    
    return methods


def count_empty_catch_blocks(node: Node) -> int:
    """
    Count catch clauses with empty or trivially empty bodies.
    Empty catch blocks are a strong predictor of silent failures.
    """
    count = 0
    
    if node.type == "catch_clause":
        # Find the block child
        for child in node.children:
            if child.type == "block":
                # Count meaningful statements (ignore comments)
                meaningful = [
                    c for c in child.children
                    if c.type not in ("{", "}", "line_comment", "block_comment")
                ]
                if len(meaningful) == 0:
                    count += 1
    
    for child in node.children:
        count += count_empty_catch_blocks(child)
    
    return count


def count_imports(node: Node) -> int:
    """Count import statements — proxy for coupling."""
    return count_nodes(node, "import_declaration")


def count_object_creations(node: Node) -> int:
    """Count 'new Foo()' expressions — proxy for tight coupling."""
    return count_nodes(node, "object_creation_expression")


def has_extends(node: Node) -> bool:
    """Check if any class extends another (inheritance signal)."""
    if node.type == "superclass":
        return True
    for child in node.children:
        if has_extends(child):
            return True
    return False


def count_implements(node: Node) -> int:
    """Count interface implementations."""
    return count_nodes(node, "super_interfaces")


def count_assertions(node: Node) -> int:
    """Count assert statements — proxy for defensive coding."""
    return count_nodes(node, "assert_statement")


def count_return_statements(node: Node) -> int:
    """Count return statements — high count in short methods suggests complexity."""
    return count_nodes(node, "return_statement")


def count_lambda_expressions(node: Node) -> int:
    """Count lambda expressions — modern Java complexity signal."""
    return count_nodes(node, "lambda_expression")


def count_comments(source_bytes: bytes) -> int:
    """Count comment lines in source (simple heuristic)."""
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


def extract_features(filepath: Path) -> dict | None:
    """
    Extract all AST-based structural features from a single Java file.
    Returns a dict of feature name -> value, or None if parsing failed.
    """
    root = parse_file(filepath)
    if root is None:
        return None
    
    source_bytes = filepath.read_bytes()
    total_lines = source_bytes.count(b"\n") + 1
    
    method_lengths = get_method_lengths(root)
    num_methods = len(method_lengths)
    avg_method_len = sum(method_lengths) / num_methods if num_methods > 0 else 0
    max_method_len = max(method_lengths) if method_lengths else 0
    
    num_classes = count_nodes(root, "class_declaration")
    num_interfaces = count_nodes(root, "interface_declaration")
    nesting_depth = max_nesting_depth(root)
    empty_catches = count_empty_catch_blocks(root)
    imports = count_imports(root)
    obj_creations = count_object_creations(root)
    extends = 1 if has_extends(root) else 0
    implements = count_implements(root)
    assertions = count_assertions(root)
    returns = count_return_statements(root)
    lambdas = count_lambda_expressions(root)
    
    # Control flow density
    control_nodes = count_nodes_multi(root, {
        "if_statement", "for_statement", "enhanced_for_statement",
        "while_statement", "do_statement", "switch_expression",
    })
    
    # Comment density
    comment_lines = count_comments(source_bytes)
    comment_density = comment_lines / total_lines if total_lines > 0 else 0
    
    # Try-catch ratio
    try_count = count_nodes(root, "try_statement")
    catch_count = count_nodes(root, "catch_clause")
    
    return {
        "file": filepath.name,
        "total_lines": total_lines,
        "num_classes": num_classes,
        "num_interfaces": num_interfaces,
        "num_methods": num_methods,
        "avg_method_length": round(avg_method_len, 2),
        "max_method_length": max_method_len,
        "max_nesting_depth": nesting_depth,
        "import_count": imports,
        "object_creation_count": obj_creations,
        "has_inheritance": extends,
        "implements_count": implements,
        "empty_catch_blocks": empty_catches,
        "try_count": try_count,
        "catch_count": catch_count,
        "assert_count": assertions,
        "return_count": returns,
        "lambda_count": lambdas,
        "control_flow_count": control_nodes,
        "comment_lines": comment_lines,
        "comment_density": round(comment_density, 4),
    }


# ── Main ────────────────────────────────────────────────────────────────────

def process_repo(repo_name: str, limit: int = 0) -> list[dict]:
    """Process all .java files in a repo and return feature dicts."""
    repo_path = REPOS_DIR / repo_name / "src"
    if not repo_path.exists():
        print(f"[ERROR] Repo source not found: {repo_path}")
        return []
    
    java_files = sorted(repo_path.rglob("*.java"))
    if limit > 0:
        java_files = java_files[:limit]
    
    print(f"\nProcessing {repo_name}: {len(java_files)} Java files")
    print("-" * 60)
    
    results = []
    for i, jf in enumerate(java_files):
        features = extract_features(jf)
        if features:
            features["repo"] = repo_name
            features["relative_path"] = str(jf.relative_to(REPOS_DIR / repo_name))
            results.append(features)
        
        if (i + 1) % 100 == 0:
            print(f"  Parsed {i+1}/{len(java_files)} files...")
    
    print(f"  Done: {len(results)}/{len(java_files)} files parsed successfully")
    return results


def main():
    ap = argparse.ArgumentParser(description="AST Feature Extraction via Tree-sitter")
    ap.add_argument("--repo", choices=["commons-collections", "commons-io", "commons-vfs", "commons-ognl", "all"],
                     default="all", help="Which repo to process")
    ap.add_argument("--limit", type=int, default=0,
                     help="Max files per repo (0 = all)")
    args = ap.parse_args()
    
    repos = []
    if args.repo in ("commons-collections", "all"):
        repos.append("commons-collections")
    if args.repo in ("commons-io", "all"):
        repos.append("commons-io")
    if args.repo in ("commons-vfs", "all"):
        repos.append("commons-vfs")
    if args.repo in ("commons-ognl", "all"):
        repos.append("commons-ognl")
    
    all_features = []
    for repo in repos:
        features = process_repo(repo, limit=args.limit)
        all_features.extend(features)
    
    if not all_features:
        print("\n[ERROR] No features extracted!")
        sys.exit(1)
    
    # Write CSV
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = list(all_features[0].keys())
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_features)
    
    print(f"\n{'='*60}")
    print(f"AST FEATURE EXTRACTION COMPLETE")
    print(f"{'='*60}")
    print(f"  Total files parsed: {len(all_features)}")
    print(f"  Features per file:  {len(fieldnames)}")
    print(f"  Output:             {OUTPUT_CSV}")
    
    # Quick summary stats
    print(f"\n  Feature Highlights:")
    import statistics
    depths = [f["max_nesting_depth"] for f in all_features]
    methods = [f["num_methods"] for f in all_features]
    catches = [f["empty_catch_blocks"] for f in all_features]
    imports = [f["import_count"] for f in all_features]
    
    print(f"    Max nesting depth:   mean={statistics.mean(depths):.2f}  max={max(depths)}")
    print(f"    Methods per file:    mean={statistics.mean(methods):.1f}  max={max(methods)}")
    print(f"    Empty catch blocks:  total={sum(catches)}  files_with={sum(1 for c in catches if c > 0)}")
    print(f"    Imports per file:    mean={statistics.mean(imports):.1f}  max={max(imports)}")


if __name__ == "__main__":
    main()
