#!/usr/bin/env python3
"""Patch deploy.yml to add a missing env var to a service's env_vars block.

Usage: python3 scripts/patch_deploy_yml.py <deploy_yml> <service> <key> <value>
"""
import re
import sys


def main() -> None:
    if len(sys.argv) != 5:
        print(f"Usage: {sys.argv[0]} <deploy_yml> <service> <key> <value>", file=sys.stderr)
        sys.exit(2)

    deploy_yml = sys.argv[1]
    service = sys.argv[2]
    env_key = sys.argv[3]
    env_val = sys.argv[4]

    with open(deploy_yml) as f:
        content = f.read()

    lines = content.split("\n")
    in_service = False
    in_env_vars = False
    last_env_line_idx = -1

    for i, line in enumerate(lines):
        if f'"{service}"' in line:
            in_service = True
            continue
        if in_service:
            if "env_vars: |" in line:
                in_env_vars = True
                continue
            if in_env_vars:
                stripped = line.strip()
                if re.match(r"^[A-Z_]+=", stripped):
                    last_env_line_idx = i
                elif stripped and not re.match(r"^[A-Z_]", stripped):
                    break
                elif not stripped:
                    continue

    if last_env_line_idx >= 0:
        indent = len(lines[last_env_line_idx]) - len(lines[last_env_line_idx].lstrip())
        new_line = " " * indent + f"{env_key}={env_val}"
        lines.insert(last_env_line_idx + 1, new_line)
        with open(deploy_yml, "w") as f:
            f.write("\n".join(lines))
        print(f"Patched: added {env_key}={env_val}")
    else:
        print(f"Warning: could not find insertion point for {env_key}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
