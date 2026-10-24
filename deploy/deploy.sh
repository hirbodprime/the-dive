#!/usr/bin/env bash
# Run on the server as root: pulls the latest GitHub build, swaps it in atomically, restarts only this app.
set -euo pipefail
APP=/opt/portfolio
URL=https://github.com/hirbodprime/the-dive/releases/download/latest/the-dive.tar.gz
NEW=$APP/releases/$(date +%Y%m%d-%H%M%S)

mkdir -p "$NEW"
curl -fsSL "$URL" | tar -xz -C "$NEW"
chown -R portfolio:portfolio "$NEW"
ln -sfn "$NEW" $APP/current.tmp && mv -T $APP/current.tmp $APP/current
systemctl restart portfolio
sleep 2 && curl -fsS -o /dev/null http://127.0.0.1:8050/ && echo "deployed $(basename "$NEW")"
# keep the last 3 builds for rollback
ls -1dt $APP/releases/* | tail -n +4 | xargs -r rm -rf
