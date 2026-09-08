"""Publish an immutable version snapshot from a trusted main-branch Actions run."""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import urllib.error
import urllib.request


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    package = json.loads((root / 'package.json').read_text())
    lock = json.loads((root / 'package-lock.json').read_text())
    version = package['version']
    if not re.fullmatch(r'(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)', version):
        raise SystemExit('Use a numeric major.minor.patch version.')
    if lock['version'] != version or lock['packages']['']['version'] != version:
        raise SystemExit('Root package and lockfile versions must match.')
    tag = f'v{version}'
    body = (root / 'releases' / f'{tag}.md').read_text().strip()
    if not body or f'MissMahta {tag}' not in body.splitlines()[0]:
        raise SystemExit('Release notes must start with the matching MissMahta version.')
    sha = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip()
    payload = dict(tag_name=tag, target_commitish=sha, name=f'MissMahta {tag}',
                   body=body, draft=False, prerelease=version.startswith('0.'),
                   make_latest='false' if version.startswith('0.') else 'true')
    if args.dry_run:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return
    if os.environ.get('GITHUB_REF') != 'refs/heads/main' or os.environ.get('GITHUB_SHA') != sha:
        raise SystemExit('Publish only the exact main-branch workflow commit.')
    repository = os.environ['GITHUB_REPOSITORY']
    if repository != 'sabervnk/webdesign':
        raise SystemExit('This workflow is scoped to sabervnk/webdesign.')
    token = os.environ['GH_TOKEN']

    def api(path, data=None):
        request = urllib.request.Request(
            f'https://api.github.com/repos/{repository}/{path}',
            data=None if data is None else json.dumps(data).encode(),
            headers={'Authorization': f'Bearer {token}',
                     'Accept': 'application/vnd.github+json',
                     'Content-Type': 'application/json',
                     'X-GitHub-Api-Version': '2022-11-28'},
            method='GET' if data is None else 'POST')
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            if error.code == 404 and data is None:
                return None
            raise SystemExit(f'GitHub API failed with HTTP {error.code}; no existing release was changed.') from None

    existing = api(f'releases/tags/{tag}')
    ref = api(f'git/ref/tags/{tag}')
    if existing is not None:
        if ref and ref['object']['type'] == 'commit' and ref['object']['sha'] == sha:
            print(f"Release already exists: {existing['html_url']}")
            return
        raise SystemExit('Version already released. Increase the version; existing releases are never overwritten.')
    if ref and (ref['object']['type'] != 'commit' or ref['object']['sha'] != sha):
        raise SystemExit('Existing tag points elsewhere. Use a new version.')
    release = api('releases', payload)
    print(f"Published {release['html_url']}")


if __name__ == '__main__':
    main()
