.PHONY: setup refresh generate quality features analyze test frontend demo backend stress
setup:
	python3 -m venv .venv
	.venv/bin/python -m pip install -r requirements.txt
	cd frontend && npm ci
refresh:
	.venv/bin/python -m analytics.pipeline refresh
generate:
	.venv/bin/python -m analytics.pipeline generate
quality:
	.venv/bin/python -m analytics.pipeline quality
features:
	.venv/bin/python -m analytics.pipeline build
analyze:
	.venv/bin/python -m analytics.pipeline analyze
test:
	.venv/bin/python -m pytest -q
frontend:
	cd frontend && npm run dev
backend:
	.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8017
stress:
	.venv/bin/python -m analytics.stress
demo:
	@test -f data/CURRENT || .venv/bin/python -m analytics.pipeline refresh
	cd frontend && npm run build
	.venv/bin/python -m uvicorn backend.app:app --host 127.0.0.1 --port 8017
