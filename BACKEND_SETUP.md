# Daftrify intake email backend

The website intake form posts to `/api/intake` on the same Cloudflare Worker.

## Cloudflare setup required once

1. In Cloudflare, open **Compute > Email Service > Email Sending**.
2. Select **Onboard Domain** and onboard `daftrify.info`.
3. Let Cloudflare create/verify the Email Sending records, including the `cf-bounce` MX/SPF/DKIM records.
4. Ensure `contact@daftrify.com` is a valid destination for the account.
5. The Worker uses the `EMAIL` binding configured in `wrangler.jsonc` and sends from `contact@daftrify.com` to `contact@daftrify.com` with the visitor's address as `Reply-To`.

## Billing requirement

Cloudflare Email Sending is available on the Workers Paid plan. Cloudflare currently includes 3,000 outbound emails per month on that plan. Email Routing itself remains available on Free and Paid plans.

## Flow

Browser form -> `POST /api/intake` -> Cloudflare Worker -> Cloudflare Email Service -> `contact@daftrify.com`

The visitor's email is placed in `Reply-To`, so replying to the notification goes directly to the visitor.

The backend validates input, strips control characters, limits request size, rejects the honeypot field when filled, restricts the sender binding to `contact@daftrify.com`, and returns a JSON success/error response.
