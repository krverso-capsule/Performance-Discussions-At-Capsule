# Performance Discussions — Rippling Custom App

Internal tooling for People Operations at Capsule. Two Rippling Function Pages
that let managers create, review, and act on performance discussion records.

Records live in the `disciplinary_action__c` custom object.

## Pages

| Page | File | What it does |
| --- | --- | --- |
| Performance Discussion Actions | `src/performanceDiscussionActions.ts` | Create, edit, submit, and review discussions. Two views: by team member, by department. |
| Overview & Guidelines | `src/overviewAndGuidelines.ts` | Read-only manager guide. Seven tabs covering principles, planning, the form, and troubleshooting. |

## Settings

Both pages read from `context.settings`. The platform lowercases every key, so
the names below are what the code must use — not what you typed in the UI.

| Key | Holds |
| --- | --- |
| `api_token_kv_api_token_1` | Bearer token for the Rippling REST API |
| `api_name_obj_performance_discussion` | API name of the custom object |

## Deploying

Rippling's function editor takes a single file. Paste the contents of the
relevant `src/` file, deploy, and test against the Executions tab.

Deployment caching has caused stale code to run more than once. If a change
appears to have no effect, confirm the deployed version number before
debugging further.

## Reading order

New to this codebase? Start here:

1. `docs/platform-quirks.md` — undocumented SDUI behaviors. Five of them will
   cost you an afternoon each if you meet them cold.
2. `docs/api-notes.md` — endpoint shapes and query syntax discovered by
   experiment.
3. `docs/architecture.md` — how the Actions page is put together.
4. `docs/open-items.md` — what is unverified or unfinished.

`docs/manager-guide.md` mirrors the Overview & Guidelines page. It is the
content managers read, kept here so it can be reviewed and edited outside the
function editor. Change it and the Rippling page together.

`docs/index.html` is the same content as a working page — the planner,
checklist, and troubleshooting entries all function. See below for publishing.

## Publishing the guide

GitHub shows HTML as source, so the working guide needs GitHub Pages.

**Settings → Pages → Source: Deploy from a branch → `main` / `/docs`.**

It goes live at `https://<org>.github.io/<repo>/` within a minute or so.
`.nojekyll` is already in `docs/` so Pages serves the file as-is rather than
trying to build a Jekyll site around it.

Two things to know:

- **Private repos need GitHub Team or Enterprise** for Pages. On the free plan,
  enabling Pages makes the site public regardless of repo visibility — which
  would put internal HR guidance on the open web. Check the plan before turning
  it on.
- If Pages isn't available, `docs/manager-guide.md` renders natively on
  github.com with no setup. It carries the same content as reference tables
  instead of a working planner.

## Layout

```
src/     Deployable function-page source, one file per page
docs/    Platform behavior, API notes, architecture, open items
```
