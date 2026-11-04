# CI Notes

## npm cache comparison

`.github/workflows/ci.yml` uses `actions/setup-node` with `cache: npm`, which caches `~/.npm` keyed by the hash of `package-lock.json`.

| Run | Cache | `npm ci` step (test, Node 22) | Job total |
|---|---|---|---|
| 1st run — https://github.com/dimitrikvateladze1-hub/devops-midterm-1/actions/runs/41873137096 | not found (cold) | 5s | 11s |
| 2nd run — https://github.com/dimitrikvateladze1-hub/devops-midterm-1/actions/runs/41875300285 | restored (warm) | 2s | 11s |

On the first run there was no cache, so npm downloaded every package from the registry (5s). On the second run setup-node restored the cache and `npm ci` installed from the local cache (2s), about 60% faster. The job totals are the same because the second run also runs coverage and uploads an artifact; on a bigger project with more dependencies the saving would be larger. The cache is saved only after a successful job and is invalidated automatically when `package-lock.json` changes.

## Self-hosted vs SaaS runner

For this project I would choose GitHub-hosted (SaaS) runners. It is a small Node.js API with short jobs that fit easily into the free minutes, it needs no special hardware or private network access, and every job gets a clean, ephemeral VM with nothing to maintain or patch. A self-hosted runner would only make sense for private network access, special hardware or much heavier builds, and it would add maintenance and security risk, because code from pull requests would run on our own machine.
