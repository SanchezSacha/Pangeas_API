#!/usr/bin/env bash
set -Eeuo pipefail
IFS=$'\n\t'

trap 'echo "Echec du deploiement a la ligne ${LINENO}." >&2' ERR

API_REPOSITORY="https://github.com/SanchezSacha/Pangeas_API.git"
FRONT_REPOSITORY="https://github.com/SanchezSacha/Pangeas.git"
DEPLOY_BRANCH="${PANGEAS_BRANCH:-v2}"
APP_USER="${PANGEAS_APP_USER:-pangeas}"
SOURCE_ROOT="${PANGEAS_SOURCE_ROOT:-/opt/pangeas}"
API_DIR="${SOURCE_ROOT}/api"
FRONT_REPOSITORY_DIR="${SOURCE_ROOT}/front"
FRONT_DIR="${FRONT_REPOSITORY_DIR}/pangeas-v1"
PUBLIC_DIR="/var/www/pangeas/public"
DATA_DIR="${PANGEAS_DATA_DIR:-/var/lib/pangeas}"
LOG_DIR="${PANGEAS_LOG_DIR:-/var/log/pangeas}"
CONFIG_DIR="${PANGEAS_CONFIG_DIR:-/etc/pangeas}"
ENV_FILE="${CONFIG_DIR}/pangeas.env"
DOMAIN="${PANGEAS_DOMAIN:-}"
ENABLE_CERTBOT="${PANGEAS_ENABLE_CERTBOT:-0}"
CERTBOT_EMAIL="${PANGEAS_CERTBOT_EMAIL:-}"
CONFIGURE_UFW="${PANGEAS_CONFIGURE_UFW:-0}"
RUN_TESTS="${PANGEAS_RUN_TESTS:-1}"

if [[ "${EUID}" -ne 0 ]]; then
    echo "Ce script doit etre execute avec sudo." >&2
    exit 1
fi

if [[ -z "${DOMAIN}" ]]; then
    echo "La variable PANGEAS_DOMAIN est obligatoire (exemple : pangeas.ecole.fr)." >&2
    exit 1
fi

if [[ ! "${DOMAIN}" =~ ^[A-Za-z0-9.-]+$ ]]; then
    echo "PANGEAS_DOMAIN doit contenir uniquement un nom d hote, sans protocole ni chemin." >&2
    exit 1
fi

if [[ "${ENABLE_CERTBOT}" == "1" && -z "${CERTBOT_EMAIL}" ]]; then
    echo "PANGEAS_CERTBOT_EMAIL est obligatoire lorsque Certbot est active." >&2
    exit 1
fi

install_system_dependencies() {
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        apache2 ca-certificates curl git gnupg openssl rsync ufw \
        docker.io certbot python3-certbot-apache

    if ! docker compose version >/dev/null 2>&1; then
        DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-v2 || \
            DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin
    fi

    local node_major=0
    if command -v node >/dev/null 2>&1; then
        node_major="$(node -p "Number(process.versions.node.split('.')[0])")"
    fi
    if (( node_major < 20 )); then
        local nodesource_setup
        nodesource_setup="$(mktemp)"
        curl -fsSL https://deb.nodesource.com/setup_22.x -o "${nodesource_setup}"
        bash "${nodesource_setup}"
        rm -f "${nodesource_setup}"
        DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
    fi

    if ! command -v pm2 >/dev/null 2>&1; then
        npm install --global pm2
    fi
}

ensure_app_user() {
    if ! id "${APP_USER}" >/dev/null 2>&1; then
        useradd --system --create-home --shell /bin/bash "${APP_USER}"
    fi

    install -d -o "${APP_USER}" -g "${APP_USER}" "${SOURCE_ROOT}"
    install -d -o "${APP_USER}" -g www-data "${PUBLIC_DIR}"
    install -d -o "${APP_USER}" -g "${APP_USER}" "${DATA_DIR}/uploads"
    install -d -o "${APP_USER}" -g "${APP_USER}" "${DATA_DIR}/private_uploads"
    install -d -o "${APP_USER}" -g "${APP_USER}" "${LOG_DIR}"
    install -d -o root -g "${APP_USER}" -m 750 "${CONFIG_DIR}"
}

sync_repository() {
    local repository="$1"
    local directory="$2"

    if [[ -d "${directory}/.git" ]]; then
        runuser -u "${APP_USER}" -- git -C "${directory}" fetch origin "${DEPLOY_BRANCH}"
        runuser -u "${APP_USER}" -- git -C "${directory}" checkout "${DEPLOY_BRANCH}"
        runuser -u "${APP_USER}" -- git -C "${directory}" pull --ff-only origin "${DEPLOY_BRANCH}"
        return
    fi

    if [[ -e "${directory}" ]]; then
        echo "Le chemin ${directory} existe mais ne contient pas un depot Git valide." >&2
        exit 1
    fi

    runuser -u "${APP_USER}" -- git clone --branch "${DEPLOY_BRANCH}" \
        "${repository}" "${directory}"
}

install_environment_file() {
    if [[ ! -f "${ENV_FILE}" ]]; then
        local session_secret mysql_password mysql_root_password mongo_password
        session_secret="$(openssl rand -hex 32)"
        mysql_password="$(openssl rand -hex 24)"
        mysql_root_password="$(openssl rand -hex 24)"
        mongo_password="$(openssl rand -hex 24)"

        install -o root -g "${APP_USER}" -m 640 \
            "${API_DIR}/deploy/production.env.example" "${ENV_FILE}"
        sed -i \
            -e "s/pangeas\.example\.fr/${DOMAIN}/g" \
            -e "s/GENERATE_SESSION_SECRET/${session_secret}/g" \
            -e "s/GENERATE_MYSQL_PASSWORD/${mysql_password}/g" \
            -e "s/GENERATE_MYSQL_ROOT_PASSWORD/${mysql_root_password}/g" \
            -e "s/GENERATE_MONGO_PASSWORD/${mongo_password}/g" \
            "${ENV_FILE}"
        echo
        echo "Le fichier ${ENV_FILE} vient d etre cree avec des secrets aleatoires."
        echo "Ajoutez uniquement la nouvelle cle dans MAIL_PASSWORD,"
        echo "puis relancez exactement le meme script."
        exit 2
    fi

    if grep -Eq "GENERATE_|CHANGE_ME" "${ENV_FILE}"; then
        echo "Le fichier ${ENV_FILE} contient encore une valeur non generee." >&2
        exit 1
    fi

    install -o "${APP_USER}" -g "${APP_USER}" -m 600 "${ENV_FILE}" "${API_DIR}/.env"
}

link_persistent_directory() {
    local target="$1"
    local link="$2"

    if [[ -L "${link}" ]]; then
        ln -sfn "${target}" "${link}"
    elif [[ -e "${link}" ]]; then
        echo "Le chemin ${link} existe deja et n est pas un lien symbolique." >&2
        echo "Deplacez son contenu vers ${target} avant de relancer le script." >&2
        exit 1
    else
        ln -s "${target}" "${link}"
    fi

    chown -h "${APP_USER}:${APP_USER}" "${link}"
}

start_databases() {
    systemctl enable --now docker
    docker compose --env-file "${API_DIR}/.env" \
        -f "${API_DIR}/deploy/docker-compose.production.yml" up -d --wait
}

build_backend() {
    runuser -u "${APP_USER}" -- bash -c "cd '${API_DIR}' && npm ci"
    runuser -u "${APP_USER}" -- bash -c "cd '${API_DIR}' && npm run prisma:generate"
    runuser -u "${APP_USER}" -- bash -c "cd '${API_DIR}' && npx prisma migrate deploy"

    if [[ "${RUN_TESTS}" == "1" ]]; then
        runuser -u "${APP_USER}" -- bash -c "cd '${API_DIR}' && npm test -- --runInBand"
    fi

    runuser -u "${APP_USER}" -- bash -c "cd '${API_DIR}' && npm prune --omit=dev"
}

build_frontend() {
    runuser -u "${APP_USER}" -- bash -c "cd '${FRONT_DIR}' && npm ci && npm run build"
    test -f "${FRONT_DIR}/dist/index.html"

    rsync -a --delete "${FRONT_DIR}/dist/" "${PUBLIC_DIR}/"
    chown -R "${APP_USER}:www-data" "${PUBLIC_DIR}"
    find "${PUBLIC_DIR}" -type d -exec chmod 750 {} +
    find "${PUBLIC_DIR}" -type f -exec chmod 640 {} +
}

configure_pm2() {
    local app_home
    app_home="$(getent passwd "${APP_USER}" | cut -d: -f6)"

    runuser -u "${APP_USER}" -- env \
        PANGEAS_API_DIR="${API_DIR}" PANGEAS_LOG_DIR="${LOG_DIR}" \
        pm2 startOrReload "${API_DIR}/deploy/ecosystem.config.cjs" --env production --update-env
    runuser -u "${APP_USER}" -- pm2 save

    env PATH="${PATH}" pm2 startup systemd -u "${APP_USER}" --hp "${app_home}" >/dev/null
}

configure_apache() {
    local temporary_config
    temporary_config="$(mktemp)"
    sed \
        -e "s|__PANGEAS_DOMAIN__|${DOMAIN}|g" \
        -e "s|__PANGEAS_PUBLIC_DIR__|${PUBLIC_DIR}|g" \
        "${API_DIR}/deploy/apache-pangeas.conf.template" > "${temporary_config}"
    install -o root -g root -m 644 "${temporary_config}" /etc/apache2/sites-available/pangeas.conf
    rm -f "${temporary_config}"

    a2enmod proxy proxy_http rewrite headers ssl
    a2ensite pangeas.conf
    a2dissite 000-default.conf >/dev/null 2>&1 || true
    apache2ctl configtest
    systemctl enable --now apache2
    systemctl reload apache2
}

configure_firewall() {
    if [[ "${CONFIGURE_UFW}" != "1" ]]; then
        return
    fi

    ufw allow OpenSSH
    ufw allow 'Apache Full'
    ufw --force enable
}

configure_https() {
    if [[ "${ENABLE_CERTBOT}" != "1" ]]; then
        echo "Certbot non execute. Le serveur doit tout de meme etre expose en HTTPS par l infrastructure de l ecole."
        return
    fi

    certbot --apache --non-interactive --agree-tos --redirect \
        --email "${CERTBOT_EMAIL}" --domain "${DOMAIN}"
}

verify_deployment() {
    curl --fail --silent --show-error http://127.0.0.1:3000/api/places >/dev/null
    curl --fail --silent --show-error --header "Host: ${DOMAIN}" http://127.0.0.1/ >/dev/null
    runuser -u "${APP_USER}" -- pm2 status pangeas-api
}

install_system_dependencies
ensure_app_user
sync_repository "${API_REPOSITORY}" "${API_DIR}"
sync_repository "${FRONT_REPOSITORY}" "${FRONT_REPOSITORY_DIR}"
install_environment_file
link_persistent_directory "${DATA_DIR}/uploads" "${API_DIR}/uploads"
link_persistent_directory "${DATA_DIR}/private_uploads" "${API_DIR}/private_uploads"
start_databases
build_backend
build_frontend
configure_pm2
configure_apache
configure_firewall
configure_https
verify_deployment

echo
echo "Deploiement termine : https://${DOMAIN}"
