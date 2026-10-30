from __future__ import annotations

import re
import subprocess
import unittest
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
WORKFLOWS = ROOT / ".github" / "workflows"


def load_workflow(name: str) -> dict:
    return yaml.safe_load((WORKFLOWS / name).read_text(encoding="utf-8"))


class WorkflowContractTests(unittest.TestCase):
    def test_every_external_action_is_pinned_to_a_full_sha(self) -> None:
        files = list(WORKFLOWS.glob("*.yml")) + list((ROOT / ".github" / "actions").glob("*/action.yml"))
        self.assertGreaterEqual(len(files), 6)
        for file in files:
            for line in file.read_text(encoding="utf-8").splitlines():
                match = re.search(r"\buses:\s*([^\s#]+)", line)
                if not match or match.group(1).startswith("./"):
                    continue
                self.assertRegex(match.group(1), r"@[0-9a-f]{40}$", f"Unpinned action in {file}: {line}")

    def test_ci_has_real_groups_and_a_stable_aggregate(self) -> None:
        workflow = load_workflow("ci.yml")
        expected = {"repo", "static", "unit", "integration", "build", "privacy", "e2e"}
        self.assertTrue(expected.issubset(workflow["jobs"]))
        aggregate = workflow["jobs"]["aggregate"]
        self.assertEqual(aggregate["name"], "CI")
        self.assertEqual(set(aggregate["needs"]), expected)
        self.assertEqual(aggregate["if"], "always()")
        self.assertEqual(workflow["permissions"], {"contents": "read"})
        triggers = workflow.get("on", workflow.get(True))
        self.assertIn("pull_request", triggers)
        pull_request = triggers["pull_request"] or {}
        self.assertNotIn("paths", pull_request)
        self.assertNotIn("paths-ignore", pull_request)
        raw = (WORKFLOWS / "ci.yml").read_text(encoding="utf-8")
        self.assertNotIn("secrets.", raw)
        self.assertNotIn("continue-on-error", raw)
        for command in ("pnpm lint", "pnpm typecheck", "pnpm test:unit", "pnpm test:integration", "pnpm build", "privacy-check.mjs", "pnpm test:e2e"):
            self.assertIn(command, raw)

    def test_release_is_main_only_and_uses_immutable_manifest(self) -> None:
        raw = (WORKFLOWS / "release-build.yml").read_text(encoding="utf-8")
        workflow = load_workflow("release-build.yml")
        triggers = workflow.get("on", workflow.get(True))
        self.assertEqual(set(triggers), {"workflow_run"})
        self.assertIn("head_branch == 'main'", workflow["jobs"]["build"]["if"])
        self.assertEqual(workflow["jobs"]["build"]["permissions"]["packages"], "write")
        self.assertIn("verify-trusted-main.mjs", raw)
        self.assertIn("container-smoke.sh", raw)
        self.assertIn("release-manifest.mjs", raw)
        self.assertNotIn("pull_request_target", raw)

    def test_production_and_rollback_are_manual_and_disabled_by_default(self) -> None:
        for name in ("promote-production.yml", "rollback.yml"):
            raw = (WORKFLOWS / name).read_text(encoding="utf-8")
            workflow = load_workflow(name)
            triggers = workflow.get("on", workflow.get(True))
            self.assertEqual(set(triggers), {"workflow_dispatch"})
            self.assertIn('DAYTRACE_PRODUCTION_ENABLED', raw)
            self.assertIn('Production is disabled by default', raw) if name.startswith("promote") else self.assertIn('rollback are disabled by default', raw)
            self.assertEqual(workflow["jobs"]["deploy" if name.startswith("promote") else "rollback"]["environment"], "production")
            self.assertNotIn("pull_request", raw)

    def test_staging_uses_main_scripts_and_serializes_deployment(self) -> None:
        workflow = load_workflow("deploy-staging.yml")
        self.assertEqual(workflow["concurrency"]["group"], "daytrace-staging")
        self.assertFalse(workflow["concurrency"]["cancel-in-progress"])
        raw = (WORKFLOWS / "deploy-staging.yml").read_text(encoding="utf-8")
        self.assertIn("ref: main", raw)
        self.assertIn("verify-release.mjs release", raw)

    def test_docker_contexts_are_whitelisted_and_exclude_sensitive_material(self) -> None:
        for name in ("api.Dockerfile", "site.Dockerfile"):
            dockerfile = (ROOT / "ops" / "cicd" / "docker" / name).read_text(encoding="utf-8")
            ignore = (ROOT / "ops" / "cicd" / "docker" / f"{name}.dockerignore").read_text(encoding="utf-8")
            self.assertTrue(ignore.startswith("**\n"))
            self.assertIn("**/*.pem", ignore)
            self.assertIn("**/*.key", ignore)
            self.assertIn("**/.env", ignore)
            self.assertIn("private", ignore)
            self.assertNotIn("design/", ignore.replace("!design/", ""))
            self.assertIn("USER node", dockerfile)
            self.assertIn("--frozen-lockfile", dockerfile)

    def test_delivery_shell_scripts_parse(self) -> None:
        scripts = ["remote-deploy.sh", "host-deploy.sh", "container-smoke.sh"]
        subprocess.run(["bash", "-n", *(str(ROOT / "ops" / "cicd" / script) for script in scripts)], check=True)
        host = (ROOT / "ops" / "cicd" / "host-deploy.sh").read_text(encoding="utf-8")
        self.assertIn("flock -w 60", host)
        self.assertIn("restore_previous", host)
        self.assertIn("scope=owner", host)


if __name__ == "__main__":
    unittest.main()
