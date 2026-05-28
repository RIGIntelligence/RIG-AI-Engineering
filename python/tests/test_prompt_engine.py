import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from rig import prompt_engine


class PromptEngineDeterminismTests(unittest.TestCase):
    def setUp(self):
        self.old_det = prompt_engine.DETERMINISTIC
        self.old_now = prompt_engine.FIXED_NOW
        self.old_paths = dict(prompt_engine.HarnessRegistry.PATHS)

    def tearDown(self):
        prompt_engine.DETERMINISTIC = self.old_det
        prompt_engine.FIXED_NOW = self.old_now
        prompt_engine.HarnessRegistry.PATHS = self.old_paths

    def test_runtime_now_uses_fixed_timestamp_in_deterministic_mode(self):
        prompt_engine.DETERMINISTIC = True
        prompt_engine.FIXED_NOW = "2026-01-01T00:00:00+00:00"
        self.assertEqual(prompt_engine.runtime_now().isoformat(), "2026-01-01T00:00:00+00:00")

    def test_session_bridge_scan_all_returns_stable_latest_file(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "a.json").write_text("{}")
            (root / "z.json").write_text("{}")
            prompt_engine.HarnessRegistry.PATHS = {"test": lambda: root}
            prompt_engine.DETERMINISTIC = True
            result = prompt_engine.SessionBridge.scan_all()
            self.assertTrue(result["test"]["latest"].endswith("z.json"))

    def test_parser_accepts_runtime_flags(self):
        parser = prompt_engine.build_parser()
        args = parser.parse_args([
            "--deterministic",
            "--now",
            "2026-01-01T00:00:00+00:00",
            "--workspace",
            "/tmp",
            "score",
            "hello",
        ])
        self.assertTrue(args.deterministic)
        self.assertEqual(args.now, "2026-01-01T00:00:00+00:00")
        self.assertEqual(args.workspace, "/tmp")
        self.assertEqual(args.command, "score")


if __name__ == "__main__":
    unittest.main()
