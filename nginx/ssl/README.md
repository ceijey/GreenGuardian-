# Nginx SSL Directory

This directory is for SSL certificates when you want to enable HTTPS.

## For Local Development (Self-signed)

Generate self-signed certificates:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/localhost.key \
  -out nginx/ssl/localhost.crt \
  -subj "/CN=localhost"
```

## For Production

Place your SSL certificates here:
- `fullchain.pem` - Your certificate chain
- `privkey.pem` - Your private key

Or use Let's Encrypt with certbot.
