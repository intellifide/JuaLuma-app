# Email Sender Policy

## Sender Roles

- OTP / one-time passcodes: `noreply@jualuma.com`
- Friendly product emails (welcome, onboarding, tips, invites, digests): `hello@jualuma.com`
- Customer support ticket traffic only: `support@jualuma.com`

## Inbound Policy for `noreply@jualuma.com`

`noreply@jualuma.com` should not accept inbound replies.

### Google Workspace Configuration

1. In Google Admin Console, open `Apps > Google Workspace > Gmail > Routing`.
2. Add a routing rule for recipient `noreply@jualuma.com`.
3. Reject the message (or route to quarantine/trash) for inbound mail.
4. Keep outbound send-as alias enabled for `noreply@jualuma.com`.

If full reject is not available in your policy tier, apply a mailbox filter to auto-delete inbound mail addressed to `noreply@jualuma.com`.
