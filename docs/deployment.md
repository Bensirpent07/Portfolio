# Portfolio CI and deployment

PRs targeting `master` run frontend typechecking, Chrome Headless tests, the production build, the server build, deployment/rollback checks, and CodeQL for C# and JavaScript/TypeScript. Pushes to `master` run the same checks and save the website and API artifacts. Once enabled, deployment uses those artifacts from the same successful run.

## GitHub setup

1. Push the branch and open a PR so GitHub can run the new checks.
2. Configure branch protection in GitHub Settings → Rules → Rulesets, following OpenLend's settings: target `master`, active enforcement, no bypass actors, require a PR with zero required approvals, require up-to-date passing frontend/backend checks, require linear history, block deletions and force pushes, and require CodeQL results. Use the **medium or higher** security threshold and **errors and warnings** alert threshold. Select the actual check names shown by the first CI run.
3. In Settings → Environments, create `production` and restrict deployment branches to `master`. Leave required reviewers unset for automatic deployment after merges.
4. Add these **production environment secrets**:
   - `DEPLOY_SSH_KEY`: the entire dedicated deployment private key. On this Windows machine, the key is at `C:\Users\benku\.ssh\portfolio-actions`. Copy it directly into GitHub, without posting it in chat or committing it.
   - `DEPLOY_HOST`: the Droplet's IPv4 address or SSH hostname.
   - `DEPLOY_KNOWN_HOSTS`: the complete verified SSH host-key entry, in the format `<host> ssh-ed25519 <server-public-key>`. The host must match `DEPLOY_HOST`. Use the server key verified during setup.
5. After the PR checks pass and the environment is ready, add the **repository variable** `DEPLOY_ENABLED` with value `true` under Settings → Secrets and variables → Actions → Variables. It must be a repository variable because the workflow evaluates it before the environment is loaded.

The deploy job runs only for pushes to `master`. PRs do not receive deployment credentials. With PR protection enabled, merging a PR triggers checks and then deployment. Leaving `DEPLOY_ENABLED` unset disables deployment while keeping CI active.

The Droplet's address and verified SSH host-key pin are supplied through environment secrets so they are not hardcoded in the repository and their values are masked in Actions logs. Strict host verification remains enabled. Update the pin deliberately if the server is replaced or its host key rotates.

## Droplet setup

The current deployment target is:

| Setting | Value |
| --- | --- |
| Host | Production environment secret `DEPLOY_HOST` |
| SSH user | `bensirpent07` |
| Website directory | `/var/www/benkuhman` |
| API directory | `/var/www/ai-chat` |
| API service | `ai-chat.service` |
| API executable | `/var/www/ai-chat/benkuhman` |

Both deployment directories are owned by `bensirpent07`. The API is published as a self-contained `linux-x64` application, preserving the existing executable-based service configuration without requiring an installed .NET runtime.

The dedicated deployment public key has already been added to this account's `~/.ssh/authorized_keys` with the `restrict` option. Forwarding and terminal allocation are disabled for that key. The matching private key is used only by the production environment.

The following entry has been validated and installed in `/etc/sudoers.d/portfolio-deploy`:

```sudoers
bensirpent07 ALL=(root) NOPASSWD: /usr/bin/systemctl restart ai-chat.service
```

To check the permission without restarting the API:

```sh
sudo -k
sudo -n -l /usr/bin/systemctl restart ai-chat.service
```

## Deployment and rollback

The workflow downloads the verified artifacts, pins SSH host verification, uploads a release to a temporary directory, and runs `scripts/deploy.sh` as the deployment user. The script checks restart permission and the release contents before changing the running application.

Before deployment, it saves both directories under `~/.local/state/portfolio-deploy/backups`, readable only by the deployment account. It keeps the five latest automatic backups. API `appsettings*.json`, `.env*`, application logs, and the website's `.well-known` directory are preserved.

Transfers compare checksums, then the API service restarts. Health checks require HTTP 405 from the POST-only local `/api/chat/stream` endpoint and a valid HTTPS response from Nginx for `benkuhman.com`. The API check does not invoke the paid chat endpoint. If a transfer, restart, or health check fails, the previous files are restored and the API restarts again. The workflow remains failed so the issue is visible. A rollback error reports the backup location for manual recovery.

To rehearse the deployment and rollback behavior on Linux using disposable directories and mocked service/HTTP calls:

```sh
bash scripts/test-deploy.sh
```

These checks use real `rsync` and do not touch the live application. Backend CI runs them before publishing the API.

## HTTPS renewal

The Nginx certificate covers `benkuhman.com` and `www.benkuhman.com`; the application accesses its API under `/api`. Keep the certificate's domain list aligned with DNS. An obsolete `api.benkuhman.com` entry previously prevented renewal.

Certbot's existing systemd timer handles renewal. To test it:

```sh
sudo certbot renew --cert-name benkuhman.com --dry-run
```
