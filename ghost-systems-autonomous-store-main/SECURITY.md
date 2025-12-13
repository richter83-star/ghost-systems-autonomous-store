# Security

## Never commit secrets
This project uses secrets for:
- Shopify Admin API token
- Shopify webhook secret
- Render API key (for GitHub Actions deploy)
- Firebase service account JSON
- Gemini API key

Store these only in:
- Render Environment Variables
- GitHub Actions Secrets (for deploy)

## If a secret was committed
1) Revoke/rotate the credential immediately.
2) Remove it from the repo history (git filter-repo / BFG).
3) Force-push the sanitized history.
4) Re-deploy with rotated secrets.

## Webhooks
Set `SHOPIFY_WEBHOOK_SECRET` and keep it private. The server verifies `X-Shopify-Hmac-Sha256` for webhook requests.
