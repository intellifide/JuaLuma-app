#!/usr/bin/env python3
"""Guard deploy workflow from env_vars clobber on GCP-managed services."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

DEFAULT_SERVICES = ("jualuma-backend",)


def find_violations(deploy_yml: Path, services: tuple[str, ...]) -> list[str]:
    lines = deploy_yml.read_text(encoding="utf-8").splitlines()
    violations: list[str] = []

    for service in services:
        in_target_step = False
        service_pattern = re.compile(rf'^\s+service:\s*"?{re.escape(service)}"?\s*$')
        for line in lines:
            if re.match(r"^\s*-\s+name:\s*", line):
                in_target_step = False

            if service_pattern.match(line):
                in_target_step = True
                continue

            if in_target_step and re.match(r"^\s+env_vars:\s*", line):
                violations.append(service)
                break

    return violations


def print_ok() -> None:
    print("[OK] deploy.yml is clean - no env_vars blocks for GCP-managed services")


def print_error(violations: list[str], output: str) -> None:
    service_list = ", ".join(violations)
    if output == "github":
        print(
            "::error::deploy.yml has env_vars blocks for GCP-managed services: "
            + service_list
        )
        print("Env vars for these services are managed directly on GCP (Secret Manager).")
        print(
            "Adding env_vars in deploy.yml will overwrite secretKeyRef bindings "
            "and drop unlisted vars."
        )
        print("Remove the env_vars block(s) to fix.")
        return

    print()
    print("==========================================================")
    print("DEPLOY.YML CLOBBER GUARD - VIOLATION DETECTED")
    print("==========================================================")
    print()
    for svc in violations:
        print(f"  x {svc} has an env_vars block in deploy.yml")
    print()
    print("---------------------------------------------------------")
    print("Env vars for these services are managed directly on GCP.")
    print("Adding env_vars in deploy.yml will overwrite Secret Manager")
    print("bindings and drop any vars not listed.")
    print()
    print("Remove the env_vars block and commit again.")
    print("---------------------------------------------------------")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "deploy_yml",
        nargs="?",
        default=".github/workflows/deploy-dev.yml",
        help="Path to deploy workflow file",
    )
    parser.add_argument(
        "--service",
        action="append",
        default=[],
        help="Service whose env vars are managed on GCP; repeatable",
    )
    parser.add_argument(
        "--output",
        choices=("plain", "github"),
        default="plain",
        help="Output style",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    deploy_yml = Path(args.deploy_yml)
    services = tuple(args.service) if args.service else DEFAULT_SERVICES

    if not deploy_yml.exists():
        print(f"[WARN] {deploy_yml} not found - skipping GCP drift guard")
        return 0

    violations = find_violations(deploy_yml, services)
    if not violations:
        print_ok()
        return 0

    print_error(violations, args.output)
    return 1


if __name__ == "__main__":
    sys.exit(main())
