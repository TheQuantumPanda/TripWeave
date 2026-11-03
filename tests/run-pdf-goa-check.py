"""Run the offline Goa PDF check in an already-open Playwright CLI session.

Example: python3 tests/run-pdf-goa-check.py --session tripweave-static \
    --base-url http://127.0.0.1:5175 --cli /path/to/playwright-cli
"""
import argparse
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--session', required=True)
parser.add_argument('--base-url', default='http://127.0.0.1:5175')
parser.add_argument('--stage', choices=['before', 'after'], default='after')
parser.add_argument('--cli', default='playwright-cli')
args = parser.parse_args()
root = Path(__file__).resolve().parent.parent
code = (root / 'tests/pdf-goa-check.js').read_text()
for token, value in {
    '__GOA_MARKDOWN__': (root / 'tests/fixtures/goa-delhi-3-day.md').read_text(),
    '__BASE_URL__': args.base_url,
    '__STAGE__': args.stage,
}.items():
    code = code.replace(repr(token), json.dumps(value))
run = subprocess.run([args.cli, f'-s={args.session}', 'run-code', code],
                     cwd=root, capture_output=True, text=True)
out = root / 'output/playwright/pdf-static-import'
out.mkdir(parents=True, exist_ok=True)
log = run.stdout + run.stderr
(out / f'{args.stage}-goa-checks.txt').write_text(log)
if run.returncode or '### Result\n' not in run.stdout:
    raise SystemExit(f'Goa check failed; see {out / (args.stage + "-goa-checks.txt")}')
result = json.loads(run.stdout.split('### Result\n', 1)[1].split('\n###', 1)[0])
(out / f'{args.stage}-goa-checks.json').write_text(json.dumps(result, indent=2))
print(f'{args.stage}: {len(result["checks"])} offline Goa assertions passed')
