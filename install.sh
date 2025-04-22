#!/bin/bash

set -e

RUSTROGEN_URL="https://github.com/Bisher-Almasri/rustrogen/releases/download/v1.0/rustrogen.app.zip"

info() {
  echo "[*] $1"
}

success() {
  echo "[✔] $1"
}

info "Downloading Rustrogen"
curl -fsSL "$RUSTROGEN_URL" -o "/tmp/rustrogen.app.zip"
info "Unzipping Rustrogen"
unzip /tmp/rustrogen.app.zip -d /tmp
info "Installing Rustrogen"
mv /tmp/rustrogen.app /Applications
success "Rustrogen installed successfully!"
