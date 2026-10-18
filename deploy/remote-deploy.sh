#!/usr/bin/env bash
# Server side of deploy/deploy.ps1. Runs in one interactive ssh session and asks for the sudo
# password once. Touches only: /var/www/washingtonquevedo.com, the nginx site
# washingtonquevedo.com, /etc/nginx/snippets/washingtonquevedo.com.conf and its certificate.
#
# Layout:  /var/www/washingtonquevedo.com/releases/<release id>/   one folder per deploy
#          /var/www/washingtonquevedo.com/current -> releases/<id>  what nginx serves (rollback.ps1 moves it)
#
# Usage: bash remote-deploy.sh <staging dir> <release id> <certbot email or -> [force_nginx 0|1]
set -euo pipefail

STAGE="${1:?staging dir}"
RELEASE="${2:?release id}"
EMAIL="${3:--}"
FORCE_NGINX="${4:-0}"

DOMAIN="washingtonquevedo.com"
WWW="www.${DOMAIN}"
BASE="/var/www/${DOMAIN}"
RELEASES="${BASE}/releases"
CURRENT="${BASE}/current"
SITE_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
SITE_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
SNIPPET="/etc/nginx/snippets/${DOMAIN}.conf"
KEEP_RELEASES=5

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
cleanup_stage() { rm -rf "${STAGE}"; }
trap cleanup_stage EXIT

[[ "${RELEASE}" =~ ^[0-9]{8}-[0-9]{6}-[0-9a-f]{7,}$ ]] || fail "unexpected release id '${RELEASE}'"
for f in site.tar.gz nginx-site.conf nginx-snippet.conf nginx-brotli.conf; do
  [[ -s "${STAGE}/${f}" ]] || fail "missing ${STAGE}/${f}"
done

log "Checking sudo (asked once)"
sudo -v

log "Checking that no other nginx site serves ${DOMAIN} or ${WWW}"
pattern="server_name[^;]*[[:space:]](www\\.)?${DOMAIN//./\\.}([[:space:];]|$)"
others="$(sudo grep -rlE "${pattern}" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null \
  | while read -r f; do [[ "$(readlink -f "$f")" == "$(readlink -f "${SITE_AVAILABLE}")" ]] || echo "$f"; done || true)"
[[ -z "${others}" ]] || fail "another enabled site already serves ${DOMAIN}: ${others}. Nothing was changed."

log "Installing release ${RELEASE}"
sudo mkdir -p "${RELEASES}/${RELEASE}"
sudo tar -xzf "${STAGE}/site.tar.gz" -C "${RELEASES}/${RELEASE}"
sudo chown -R root:root "${RELEASES}/${RELEASE}"
sudo find "${RELEASES}/${RELEASE}" -type d -exec chmod 755 {} +
sudo find "${RELEASES}/${RELEASE}" -type f -exec chmod 644 {} +
[[ -f "${RELEASES}/${RELEASE}/index.html" ]] || fail "the package has no index.html"

previous="$(readlink -f "${CURRENT}" 2>/dev/null || true)"

log "Writing the headers and compression snippet"
snippet_backup=""
if [[ -f "${SNIPPET}" ]]; then
  snippet_backup="${SNIPPET}.bak.$(date +%Y%m%d%H%M%S)"
  sudo cp -p "${SNIPPET}" "${snippet_backup}"
fi
brotli_available=0
if nginx -V 2>&1 | grep -qi brotli || ls /etc/nginx/modules-enabled/ 2>/dev/null | grep -qi brotli; then
  brotli_available=1
fi
if [[ ${brotli_available} -eq 1 ]]; then
  cat "${STAGE}/nginx-snippet.conf" "${STAGE}/nginx-brotli.conf" | sudo tee "${SNIPPET}" >/dev/null
  echo "brotli module found: brotli_static enabled"
else
  sudo install -m 644 "${STAGE}/nginx-snippet.conf" "${SNIPPET}"
  echo "no brotli module: gzip only"
fi

log "Configuring the nginx site"
created_site=0
linked_site=0
site_backup=""
if [[ ! -f "${SITE_AVAILABLE}" || "${FORCE_NGINX}" == "1" ]]; then
  if [[ -f "${SITE_AVAILABLE}" ]]; then
    site_backup="${SITE_AVAILABLE}.bak.$(date +%Y%m%d%H%M%S)"
    sudo cp -p "${SITE_AVAILABLE}" "${site_backup}"
  fi
  sudo install -m 644 "${STAGE}/nginx-site.conf" "${SITE_AVAILABLE}"
  created_site=1
else
  echo "keeping the existing ${SITE_AVAILABLE} (managed by certbot); use -ForceNginx to replace it"
fi
if [[ ! -L "${SITE_ENABLED}" ]]; then
  sudo ln -s "${SITE_AVAILABLE}" "${SITE_ENABLED}"
  linked_site=1
fi

log "Switching ${CURRENT} to release ${RELEASE}"
sudo ln -sfn "${RELEASES}/${RELEASE}" "${CURRENT}.tmp"
sudo mv -Tf "${CURRENT}.tmp" "${CURRENT}"

undo() {
  echo "undoing: previous release, snippet and site restored; nginx NOT reloaded" >&2
  if [[ -n "${previous}" ]]; then sudo ln -sfn "${previous}" "${CURRENT}"; fi
  if [[ -n "${snippet_backup}" ]]; then sudo mv -f "${snippet_backup}" "${SNIPPET}"; else sudo rm -f "${SNIPPET}"; fi
  [[ ${linked_site} -eq 1 ]] && sudo rm -f "${SITE_ENABLED}"
  if [[ ${created_site} -eq 1 ]]; then
    if [[ -n "${site_backup}" ]]; then sudo mv -f "${site_backup}" "${SITE_AVAILABLE}"; else sudo rm -f "${SITE_AVAILABLE}"; fi
  fi
}

if ! sudo nginx -t; then
  # A brotli snippet can fail if the module is only partly installed: retry once with gzip only.
  if [[ ${brotli_available} -eq 1 ]]; then
    echo "nginx -t failed with brotli; retrying with gzip only" >&2
    sudo install -m 644 "${STAGE}/nginx-snippet.conf" "${SNIPPET}"
  fi
  if ! sudo nginx -t; then
    undo
    fail "nginx configuration test failed"
  fi
fi
sudo systemctl reload nginx
[[ -n "${snippet_backup}" ]] && sudo rm -f "${snippet_backup}"

log "Requesting or renewing the certificate for ${DOMAIN} and ${WWW}"
email_args=(--register-unsafely-without-email)
if [[ "${EMAIL}" != "-" ]]; then email_args=(-m "${EMAIL}"); fi
# With an existing certbot account on the server the email is not needed.
if sudo certbot show_account >/dev/null 2>&1; then email_args=(); fi
sudo certbot --nginx -d "${DOMAIN}" -d "${WWW}" --non-interactive --agree-tos --redirect \
  --keep-until-expiring "${email_args[@]}"
sudo nginx -t && sudo systemctl reload nginx

log "Server-side check through nginx (127.0.0.1)"
code="$(curl -s -o /dev/null -w '%{http_code}' --resolve "${DOMAIN}:443:127.0.0.1" "https://${DOMAIN}/" || true)"
[[ "${code}" == "200" ]] || fail "https://${DOMAIN}/ answered ${code:-nothing} on the server"
echo "https://${DOMAIN}/ -> 200"

log "Keeping the ${KEEP_RELEASES} newest releases"
keep_current="$(readlink -f "${CURRENT}")"
mapfile -t old < <(ls -1d "${RELEASES}"/*/ 2>/dev/null | sed 's#/$##' | sort -r | tail -n +$((KEEP_RELEASES + 1)))
for dir in "${old[@]}"; do
  [[ "$(readlink -f "${dir}")" == "${keep_current}" || "$(readlink -f "${dir}")" == "${previous}" ]] && continue
  sudo rm -rf "${dir}"
  echo "removed $(basename "${dir}")"
done

log "Done. Releases (newest first):"
ls -1 "${RELEASES}" | sort -r | while read -r r; do
  [[ "${RELEASES}/${r}" == "${keep_current}" ]] && echo "  ${r}  <- current" || echo "  ${r}"
done
