# CD and Rollback

Pipeline: `.github/workflows/deploy.yml`
- push of a `v*` tag → **build-and-push** (image `ghcr.io/dimitrikvateladze1-hub/devops-midterm-1:<tag>`, repo name lowercase) → **deploy-staging** (run container, check with `scripts/smoke.sh`)
- **deploy-production** runs only via `workflow_dispatch` with a `version` input. This is the manual approval step.

## Step by step

| # | Action | Run | Result |
|---|---|---|---|
| 1 | Tag `v1.0.0` pushed → build + staging | https://github.com/dimitrikvateladze1-hub/devops-midterm-1/actions/runs/41890750747 | ✅ staging smoke passed |
| 2 | Manual production deploy of `v1.0.0` (`workflow_dispatch`, version=v1.0.0) | https://github.com/dimitrikvateladze1-hub/devops-midterm-1/actions/runs/41892000817 | ✅ production on v1.0.0 |
| 3 | Broke `/health` (always 503), tag `v1.1.0` pushed | https://github.com/dimitrikvateladze1-hub/devops-midterm-1/actions/runs/41892397208 | ❌ deploy-staging failed: `smoke: /health returned 503`; production job did not run, **production stayed on v1.0.0** |
| 4 | Rollback: re-deployed `v1.0.0` to production (`workflow_dispatch`, version=v1.0.0) | https://github.com/dimitrikvateladze1-hub/devops-midterm-1/actions/runs/41893095598 | ✅ production confirmed on v1.0.0 |
| 5 | `git revert` of the breaking commit (`09c4112`), tag `v1.1.1` pushed | https://github.com/dimitrikvateladze1-hub/devops-midterm-1/actions/runs/41893634684 | ✅ staging smoke passed again |

Notes:
- One earlier manual run failed because the version input was `main` instead of `v1.0.0` (no image with that tag), and production was not changed.
- Two intermediate `v1.1.1` runs (Deploy #6, #7) failed because the tag was first pushed before the revert commit existed; the tag was deleted and re-created on the revert commit `1b2d67f`, giving the green run above.

## Commands used

```bash
git tag v1.0.0 && git push origin v1.0.0
# GitHub: Actions → Deploy → Run workflow, version = v1.0.0

sed -i 's/res.status(ok ? 200 : 503)/res.status(503)/' src/app.js
git commit -am "Break /health: always return 503" && git push
git tag v1.1.0 && git push origin v1.1.0          # staging fails

# GitHub: Actions → Deploy → Run workflow, version = v1.0.0   (rollback)

git revert --no-edit 09c4112 && git push
git tag v1.1.1 && git push origin v1.1.1          # staging passes
```

## Blue-green vs canary, and feature flags

For this service I would choose **blue-green**: it is a small stateless API behind one endpoint, so keeping the previous version (blue) running while the new one (green) is smoke-tested and then switching traffic at once gives an instant rollback by switching back, which is simpler than canary's gradual traffic splitting and metrics analysis that only pays off with large traffic. A **feature flag** would have helped avoid this incident by shipping the risky change to `/health` turned off by default: the code could be deployed safely, the flag enabled for a small group or in staging first, and when it misbehaved, turned off in seconds without a rebuild, redeploy or `git revert`.
