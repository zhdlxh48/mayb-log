# Synology/Xpenology 배포

이 문서는 x86_64 N100 기반 DSM/Xpenology의 Container Manager 또는 Docker Compose v2와, Raspberry Pi에서 실행 중인 Caddy를 전제로 합니다. GitHub Actions는 GHCR image까지만 만들며 NAS 배포와 Caddy 변경은 사용자가 수행합니다.

## 디렉터리 준비

저장소의 `compose.yaml`, `.env.example`, `deployment/garage.toml`을 NAS에 복사합니다. 다음처럼 설정과 영구 데이터를 분리합니다.

```text
/volume1/docker/mayb-log/
├── compose.yaml
├── .env
├── garage.toml
└── data/
    ├── postgres/
    └── garage/
        ├── meta/
        └── data/
```

이 구조에서는 `.env`의 `GARAGE_CONFIG_FILE=./garage.toml`, `DATA_ROOT=/volume1/docker/mayb-log/data`로 설정합니다. PostgreSQL 18은 host의 `data/postgres`를 container의 `/var/lib/postgresql`에 mount합니다. 이전 버전 경로인 `/var/lib/postgresql/data`를 사용하지 마세요.

## Secret과 환경 변수

`.env.example`을 `.env`로 복사한 뒤 placeholder를 모두 바꿉니다. Linux/macOS 또는 Synology shell에서 다음과 같이 값을 만들 수 있습니다.

```bash
openssl rand -hex 32                    # BETTER_AUTH_SECRET
openssl rand -hex 32                    # POSTGRES_PASSWORD
openssl rand -hex 32                    # GARAGE_RPC_SECRET
echo "GK$(openssl rand -hex 16)"        # Garage/S3 access key
openssl rand -hex 32                    # Garage/S3 secret key
```

Garage access key는 `GK`와 32자리 hex를 합친 형식을 사용합니다. 다음 값은 서로 같아야 합니다.

```text
POSTGRES_PASSWORD = PGPASSWORD
GARAGE_DEFAULT_ACCESS_KEY = S3_ACCESS_KEY_ID
GARAGE_DEFAULT_SECRET_KEY = S3_SECRET_ACCESS_KEY
GARAGE_DEFAULT_BUCKET = S3_BUCKET
SITE_URL = ORIGIN = https://blog.mayb.moe
```

운영 Turnstile site key와 secret key를 설정합니다. `.env`와 백업본을 Git에 넣지 마세요. `MAYB_LOG_IMAGE`는 검증된 immutable image를 권장합니다.

```text
MAYB_LOG_IMAGE=ghcr.io/zhdlxh48/mayb-log:sha-<full-commit-sha>
```

GHCR package가 Public이면 별도 로그인이 필요 없습니다. Private이면 package read 권한이 있는 credential을 사용해 NAS에서 로그인합니다.

```bash
docker login ghcr.io
```

저장소가 public이어도 package visibility는 자동으로 public이 되지 않을 수 있습니다. 원하면 GitHub Packages 설정에서 package visibility를 Public으로 바꿀 수 있습니다.

## 최초 실행

```bash
cd /volume1/docker/mayb-log
docker compose pull
docker compose up -d
```

PostgreSQL과 Garage healthcheck가 성공하면 app이 시작됩니다. Garage는 최초 시작에 지정된 key와 bucket을 만들고, app은 listen 전에 Drizzle migration을 자동 적용합니다. 별도 migration 명령은 필요 없습니다. migration이 실패하면 app container도 정상 상태가 되지 않습니다.

상태와 로그를 확인합니다.

```bash
docker compose ps
docker compose logs postgres
docker compose logs garage
docker compose logs app
curl http://<SYNOLOGY_LAN_IP>:3000
```

PostgreSQL과 Garage의 S3/RPC/admin 포트는 host에 공개되지 않습니다. app의 3000번 포트만 LAN에 공개됩니다. 필요하면 `.env`의 `APP_BIND_ADDRESS`와 `APP_PORT`를 조정합니다.

## Caddy

Raspberry Pi의 Caddyfile에 NAS의 실제 LAN 주소를 넣습니다. repository나 `.env.example`에 주소를 hard-code하지 않습니다.

```caddyfile
blog.mayb.moe {
    reverse_proxy <SYNOLOGY_LAN_IP>:3000
}
```

Caddy가 TLS를 종료하고 container까지는 LAN HTTP를 사용합니다. app의 `ORIGIN=https://blog.mayb.moe` 설정이 form action의 canonical origin을 보장합니다. Caddy reload는 이 프로젝트가 자동 수행하지 않습니다.

## 업데이트와 rollback

새 GHCR image의 검증이 끝나면 `.env`의 full SHA tag를 바꾸고 다음을 실행합니다.

```bash
docker compose pull
docker compose up -d
```

NAS에서 `pnpm install`, `pnpm build`, `docker build`를 실행할 필요가 없습니다. 되돌릴 때는 `MAYB_LOG_IMAGE`를 이전 full SHA tag로 바꾸고 같은 명령을 실행합니다.

Docker image rollback은 DB schema rollback이 아닙니다. 이전 app이 새 schema와 호환되지 않을 수 있으므로 앞으로 migration은 가능한 한 expand → application migration → contract 순서로 배포합니다. rollback 전에는 migration 내용과 백업을 확인하세요.

## 백업

single-node Garage와 SSD 한 개는 redundancy가 아닙니다. 최소한 다음을 별도 물리 장치나 원격 저장소에 백업합니다.

- `pg_dump`로 만든 PostgreSQL 논리 백업과 복구 검증본
- Garage metadata (`data/garage/meta`)
- Garage object data (`data/garage/data`)
- production `.env`와 secret의 암호화된 별도 사본

Garage metadata와 object data를 서로 다른 시점에 복사하면 일관성이 깨질 수 있습니다. Garage 공식 snapshot/backup 절차를 확인하고 서비스를 멈추거나 일관된 filesystem snapshot을 사용하세요. Synology Btrfs snapshot은 같은 장치 안의 복구 수단이며 off-device backup이 아닙니다.

## 기존 Cloudflare 데이터

이 배포는 기존 D1과 R2 데이터를 자동으로 옮기지 않습니다. 운영 데이터가 있다면 cutover 전에 별도 one-off 이전과 검증이 필요합니다.

- D1 SQLite export를 PostgreSQL에 그대로 import하지 않습니다. boolean, timestamptz, serial, FK, `pg_trgm` 차이를 변환합니다.
- R2 object는 기존 `posts/{assetId}/{imageId}.webp` key를 그대로 Garage에 복사할 수 있습니다.
- key를 유지하면 Markdown의 `/media/{assetId}/{imageId}.webp` URL은 바뀌지 않습니다.
- DB 행 수, 참조 무결성, 공개/예약 상태, 사용자 로그인과 이미지 GET을 확인한 뒤 DNS/Caddy를 전환합니다.

이번 repository 변경은 live Cloudflare 계정이나 production 데이터에 접속하지 않습니다.
