"""Independent stress build. Never changes the active baseline CURRENT pointer."""

import json, time
from .pipeline import ROOT, build, analyze, dump
from .generate import generate
from .quality import quality

if __name__ == "__main__":
    cfg = json.loads((ROOT / "config/project.json").read_text())
    cfg["scenario"] = "stress"
    path = ROOT / "data/stress"
    started = time.perf_counter()
    generate(cfg, path / "raw")
    quality(path / "raw", path / "clean")
    build(path / "raw", path / "clean", path / "derived")
    a = analyze(path / "raw", path / "derived", cfg)
    dump(
        ROOT / "reports/stress.json",
        dict(
            config=cfg,
            performance=a["performance"],
            runtime_seconds=time.perf_counter() - started,
        ),
    )
    print("Stress report saved; baseline preserved.")
