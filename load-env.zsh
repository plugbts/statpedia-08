#!/bin/zsh
# Usage: source ./load-env.zsh
# Loads all key=value pairs from .env into your current shell session
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^[A-Za-z_][A-Za-z0-9_]*=' | xargs)
  echo "Loaded environment variables from .env"
else
  echo ".env file not found."
fi
