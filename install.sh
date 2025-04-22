#!/bin/bash

set -e

RUSTROGEN_URL="https://github.com/Bisher-Almasri/rustrogen/releases/download/v1.0/rustrogen.app.zip"

info() {
  echo "[*] $1"
}

success() {
  echo "[✔] $1"
}
if [ -d "/Applications/rustrogen.app" ]; then
  echo "Rustrogen is already installed."
  echo "Would you like to reinstall it?"
  select yn in "Yes" "No"; do
    case $yn in
        Yes ) rm -rf /Applications/rustrogen.app; break;;
        No ) exit;;
    esac
  done
fi
info "Downloading Rustrogen"
curl -fsSL "$RUSTROGEN_URL" -o "/tmp/rustrogen.app.zip"
info "Unzipping Rustrogen"
unzip /tmp/rustrogen.app.zip -d /tmp
info "Installing Rustrogen"
mv /tmp/rustrogen.app /Applications
info "Trusting Rustrogen"
xattr -rd com.apple.quarantine /Applications/rustrogen.app
chmod +x /Applications/rustrogen.app/Contents/MacOS/rustrogen
info "Cleaning up"
rm /tmp/rustrogen.app.zip
success "Rustrogen installed successfully!"

info "Would you like to open Rustrogen now?"
select yn in "Yes" "No"; do
    case $yn in
        Yes ) open /Applications/rustrogen.app; break;;
        No ) break;;
    esac
done