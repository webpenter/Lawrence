#!/usr/bin/env bash
# Local dev services for Lawrence — rootless Postgres 16 + PostGIS and Typesense 27.1.
# Stack lives in ~/lawrence-devstack (installed via micromamba; no sudo, no Docker).
# Usage: scripts/dev-services.sh start|stop|status
set -euo pipefail

STACK="$HOME/lawrence-devstack"
PG_CTL="$STACK/env/bin/pg_ctl"
PGDATA="$STACK/pgdata"
PG_OPTS="-p 5432 -k $STACK/run -c listen_addresses=localhost"
TS_PIDFILE="$STACK/run/typesense.pid"

start() {
  mkdir -p "$STACK/run" "$STACK/logs"
  if ! "$PG_CTL" -D "$PGDATA" status > /dev/null 2>&1; then
    "$PG_CTL" -D "$PGDATA" -l "$STACK/logs/postgres.log" -o "$PG_OPTS" start
  else
    echo "postgres: already running"
  fi
  if [ -f "$TS_PIDFILE" ] && kill -0 "$(cat "$TS_PIDFILE")" 2> /dev/null; then
    echo "typesense: already running"
  else
    nohup "$STACK/typesense-server" --data-dir "$STACK/tsdata" --api-key=devkey \
      --enable-cors --api-port 8108 > "$STACK/logs/typesense.log" 2>&1 &
    echo $! > "$TS_PIDFILE"
    echo "typesense: started (pid $(cat "$TS_PIDFILE"))"
  fi
}

stop() {
  "$PG_CTL" -D "$PGDATA" stop 2> /dev/null || echo "postgres: not running"
  if [ -f "$TS_PIDFILE" ]; then
    kill "$(cat "$TS_PIDFILE")" 2> /dev/null || true
    rm -f "$TS_PIDFILE"
    echo "typesense: stopped"
  fi
}

status() {
  "$PG_CTL" -D "$PGDATA" status || true
  curl -s -m 3 http://localhost:8108/health && echo " (typesense)" || echo "typesense: down"
}

case "${1:-status}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  *) echo "usage: $0 start|stop|status" >&2; exit 1 ;;
esac
