#!/bin/zsh

set -e

RUSTROGEN_URL="https://github.com/Bisher-Almasri/rustrogen/releases/download/v1.0/rustrogen.app.zip"

info() {
  echo "[*] $1"
}

success() {
  echo "[✔] $1"
}

if [ -t 0 ]; then
  INTERACTIVE=true
else
  INTERACTIVE=false
fi

if [ -d "/Applications/rustrogen.app" ]; then
  echo "Rustrogen is already installed."
  
  if [ "$INTERACTIVE" = true ]; then
    echo "Would you like to reinstall it?"
    select yn in "Yes" "No"; do
      case $yn in
          Yes ) rm -rf /Applications/rustrogen.app; break;;
          No ) exit;;
      esac
    done
  else
    info "Reinstalling Rustrogen automatically"
    rm -rf /Applications/rustrogen.app
  fi
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

if [ "$INTERACTIVE" = true ]; then
  info "Would you like to open Rustrogen now?"
  select yn in "Yes" "No"; do
      case $yn in
          Yes ) open /Applications/rustrogen.app; break;;
          No ) break;;
      esac
  done
else
  info "Run 'open /Applications/rustrogen.app' to start Rustrogen"
fi