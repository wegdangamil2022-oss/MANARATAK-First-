# R07 — actual Linux review proof

## Latest verified candidate

Source `1349371f29902857be7444cf89457e90a1d4b25d`, push run [39315368366](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39315368366): all six jobs passed. All eight PR workflows passed, and the combined check-run snapshot contains 23 successes, zero failures and zero pending checks. The separate CodeQL result reports no new alerts after the [specific security repairs and dispositions](POST28_R07_CODEQL_REVIEW_2026-10-19.md). The retired Vercel preview has no failure status on this source; automatic deployment of this branch is disabled by the owner-authorized configuration.

The exact new Linux image is `sha256:1dc876402e7dc6a203a758509b84c354b7f2689cdda0d76fe6ce9496255f9245`. Freshly retrieved API/Web/Admin artifacts booted against a newly created isolated PostgreSQL 16 lab. All 111 migration checksums matched and schema diff was empty. The application used restricted `post28_app`; setup credentials were not used for application requests. Readiness, Admin login rendering, student form login/persisted dashboard, strict cookies, foreign-owner and admin denial, and logout/session revocation all passed in real Chromium over validated HTTPS.

Current runtime totals: eight observations, 59 same-origin responses, zero page errors and zero HTTP 5xx. All **31 console errors** remain in the receipt (expected 401/403 checks and external images blocked by the isolated policy). API stopped with exit code zero in **160 ms**; its container, the owned PG lab and network were removed, without touching existing databases. The identity/workspace were synthetic fixtures; this does not prove self-registration, email delivery or sensitive Admin writes. Workers/providers stayed disabled and production acceptance remains false.

Current [runtime result](../reviews/evidence/post28/1349371f29902857be7444cf89457e90a1d4b25d/r07-linux-runtime/result.json), [image/native proof](../reviews/evidence/post28/1349371f29902857be7444cf89457e90a1d4b25d/r07-linux-runtime/linux-image-probe.json), [retrieval receipt](../reviews/evidence/post28/1349371f29902857be7444cf89457e90a1d4b25d/r07-linux-runtime/artifact-retrieval.txt), [archive-digest receipts](../reviews/evidence/post28/1349371f29902857be7444cf89457e90a1d4b25d/r07-linux-runtime/archive-receipts.json) and [actual student dashboard](../reviews/evidence/post28/1349371f29902857be7444cf89457e90a1d4b25d/r07-linux-runtime/student-dashboard.png).

The manifest SHA256 is `4c7364dbfabb9e3b686a2419b0257ce6acb420f1500ea72c077aa8e8afed6d03`. Downloaded Linux proof ZIP SHA256 is `5f831585d503abda22cf71aa9f3fa2d952345d47f40381bd11ea8a07de5cb2a2`; retrieval ZIP is `a5d5d58f6e1edd2f8cec23b4abfa722464d33db8120c4fb0de105dd51e3cb235`. Each was verified against GitHub's artifact digest before retaining the allowlisted files. Source CI/native-only receipts intentionally say runtime unverified at their earlier stage; the later runtime result proves boot of that exact image.

R07's agreed isolated Linux diagnostic and CI scope is complete on this SHA. Formal release acceptance, prior security-alert review, signing/hosting release configuration and production promotion remain open. R05 local closure and R06 comprehensive exceptions are preserved. The three unfinished R08 fixture changes remain uncommitted and separately backed up; none is represented as verified by this R07 proof.

## Earlier Linux proof retained without rebinding

Verified implementation: `6dfae89cf3278678a0c50a49fd9c9f4bf37e2e8a`, branch `feat/post28-r07-artifact-preparation`.

Actual GitHub Actions run [39309948873](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39309948873) completed successfully in all six jobs: full source closure, translation, deployment configuration validation, restricted Redis/process diagnostic, immutable artifact retrieval, and actual Linux runtime review. Configuration validation did not deploy anything.

## What ran

The source job built fresh artifacts outside the checkout. A separate job retrieved them from Actions storage, checked the independently retained manifest digest, and verified each unit against the exact source. The manifest digest is `ed2b35ab4d3a5b5367e6fb46178e19554a569421ecd7d811d5c0195179954d64`. The legacy tracked SOURCE_SHA_UNAVAILABLE archives were not used.

The Linux job independently installed the locked production layer and generated-client inputs, built a digest-bound Node 22.16.0 Linux x64 image, and loaded native modules as UID 1000 with no network. Image: `sha256:7291fc619ca888658b1bfd29cc33ea034746a5dacad15ef3a945e068d8725019`.

The actual API image then connected to a newly created isolated PostgreSQL 16 lab. All 111 migrations and their checksums matched; schema diff exited zero. Application role `post28_app` had no superuser, database/role creation, replication, RLS bypass, schema CREATE, or migration-ledger UPDATE privileges. The migrator was used only for reviewed schema provisioning and synthetic fixture setup.

Freshly unpacked Web and Admin units ran behind the real local HTTPS artifact gateway. Chromium 151 executed the form login, persisted student dashboard, access denial and logout journey. TLS hostname validation stayed enabled and the synthetic certificate's exact SPKI was pinned.

## Observations

- All three readiness/build endpoints returned 200 and the exact source revision.
- Admin login UI rendered from its actual bundle.
- Student form login returned 200; one active session persisted in PostgreSQL and the dashboard API returned 200.
- Both authentication cookies were HttpOnly, Secure and SameSite Strict.
- Student access to the admin API returned 403. A foreign student dashboard request returned 403.
- UI logout returned 200, active persisted sessions became zero and `/auth/me` returned 401.
- Eight observations, 59 same-origin responses, zero page errors and zero HTTP 5xx responses.
- The 32 console error entries are retained. They include expected 401/403 access checks and requests to `images.unsplash.com` deliberately blocked by the isolated browser routing policy. This is not a claim of an empty browser console or fully external-connected UI coverage.
- API stopped with exit code zero in 124 ms. The owned API/PG containers and internal network were removed. Existing databases were not touched.

Workers and external providers remained disabled. No production/Neon connection, image publication, domain purchase, main merge or release promotion occurred.

## Evidence and boundaries

[Runtime result](../reviews/evidence/post28/6dfae89cf3278678a0c50a49fd9c9f4bf37e2e8a/r07-linux-runtime/result.json), [image/native proof](../reviews/evidence/post28/6dfae89cf3278678a0c50a49fd9c9f4bf37e2e8a/r07-linux-runtime/linux-image-probe.json), [retrieval receipt](../reviews/evidence/post28/6dfae89cf3278678a0c50a49fd9c9f4bf37e2e8a/r07-linux-runtime/artifact-retrieval.txt), and [actual browser screenshot](../reviews/evidence/post28/6dfae89cf3278678a0c50a49fd9c9f4bf37e2e8a/r07-linux-runtime/student-dashboard.png).

Downloaded Linux proof ZIP SHA256: `390aad71a28de119d1f338de4b627005cccdd42bc594f90e4eb624447eedf4e3`, matching the Actions artifact digest. Retrieved-archive ZIP SHA256: `471c372f6f0d85a1db192aa78db4d19c54156c4e28cda072fc1b8eb9ded0e84e`. Private lab credentials and TLS private keys are excluded from retained artifacts.

This completes the requested isolated Linux diagnostic at the stated SHA. Formal release acceptance and production promotion remain separate gates. R05 local acceptance and R06 comprehensive exceptions are unchanged. Later CI-only repairs at `5879c610bc0527db89a4d29ccb46934aa251864d` independently passed all eight PR workflows and all six jobs in push run [39311706942](https://github.com/wegdangamil2022-oss/MANARATAK-First-/actions/runs/39311706942), including artifact retrieval and Linux runtime. The retained raw runtime files in this report still belong to `6dfae89`; they are not rebound to a later SHA or to the documentation commit.

The GitHub status named Vercel reported failure for `dpl_HQNC2fV8g8AZs1jCxk51jbADnv5n` in project `manaratak-2-preview-2026`. Authenticated read-only inspection of the exact deployment and project returned 404, including an explicitly resolved `manatratk` team ID. A project-name search in that team returned no matching projects. The build cause is therefore unavailable in the connected account.

The owner explicitly confirmed that this preview project is retired and no longer used. Commit `6f9cae73dfad7a2886bb0f4225ca49cb256e6d05` adds the officially supported `git.deploymentEnabled` setting for `feat/post28-r07-artifact-preparation: false` in root `vercel.json`. Other branches are not configured by this change. This prevents automatic Git deployments from this remediation branch where that project reads the repository configuration; it neither deletes the old project nor deploys a replacement. See [Vercel Git configuration](https://vercel.com/docs/project-configuration/git-configuration). GitHub checks, including its deployment-configuration validation, remain enabled. No notification preferences or synthetic check statuses were changed. The seven directly affected repository-organization tests and the full organization verifier passed locally; no application rebuild or unrelated local tests were repeated for this configuration change.

Subsequent checks on `1349371` confirmed no legacy Vercel failure status. Historical failed deployments and CI attempts remain failed.
