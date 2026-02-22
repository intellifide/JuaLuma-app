<!-- LAST MODIFIED: 2025-12-23T12:12:41-06:00 -->

# DOCUMENTATION - Stripe Test Credentials

This document provides the official Stripe test credentials and scenarios for verifying the JuaLuma-app integration.

## Core Test Cards

Use these numbers for standard "Success" scenarios. You can use any future expiration date (e.g., 01/2030) and any 3-digit CVC (or 4 digits for AMEX).

| Brand                   | Card Number           |
| :---------------------- | :-------------------- |
| Visa                    | `4242 4242 4242 4242` |
| Mastercard              | `5555 5555 5555 4444` |
| American Express (AMEX) | `3782 822463 10005`   |
| Discover                | `6011 1111 1111 1117` |
| Visa (Debit)            | `4000 0566 5566 5556` |

## Failure & Error Scenarios

Use these specific numbers to trigger declined payments or error codes in your application logic.

| Scenario           | Card Number           | Error Code           |
| :----------------- | :-------------------- | :------------------- |
| Generic Decline    | `4000 0000 0000 0002` | `card_declined`      |
| Insufficient Funds | `4000 0000 0000 9995` | `insufficient_funds` |
| Lost Card          | `4000 0000 0000 9987` | `lost_card`          |
| Stolen Card        | `4000 0000 0000 9979` | `stolen_card`        |
| Expired Card       | `4000 0000 0000 0069` | `expired_card`       |
| Incorrect CVC      | `4000 0000 0000 0127` | `incorrect_cvc`      |

## 3D Secure (3DS) Authentication

To test SCA (Strong Customer Authentication) flows, use these cards:

- **Authentication Required:** `4000 0025 0000 3155` (Triggers the 3DS challenge popup).
- **Always Fail Authentication:** `4000 0826 0000 3178`.

## Integration Notes

- **API Keys:** Obtain your Publishable key and Secret key from the Developers > API Keys section of your Stripe Dashboard.
- **Billing Details:** For test transactions, you may use any name, address, or zip code unless you are specifically testing AVS (Address Verification System) failures.
- **SMS Verification:** If prompted for a code while creating test accounts, use `000-000`.
