# JuaLuma Signup Flow Testing Guide

## Overview
This document provides step-by-step instructions for manually testing the complete signup flow after the recent fixes and enhancements.

## Prerequisites
- Backend API running on `http://localhost:8000`
- Frontend app running on `http://localhost:5175`
- Email service configured (or using mock email client for local testing)
- Stripe test mode configured (for paid plan testing)
- All test user emails must use `@testmail.app` (no `@example.com` or `@gmail.com`)

## Test Environment Setup

### 1. Start the Backend
```bash
cd backend
uvicorn main:app --reload
```

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```

### 3. Open Browser Console
- Open DevTools (F12 or Cmd+Option+I)
- Navigate to Console tab to view analytics events

---

## Test Suite 1: Free Plan Signup Flow

### Test 1.1: Account Creation
**Steps:**
1. Navigate to `http://localhost:5175/signup`
2. Fill in the signup form:
   - Email: `test+free@testmail.app`
   - Password: `SecurePass123!`
   - Confirm Password: `SecurePass123!`
3. Check all three consent checkboxes
4. Click "Create account"

**Expected Results:**
- ✅ Password strength indicators turn green as requirements are met
- ✅ Form submits successfully
- ✅ Redirected to `/verify-email`
- ✅ Console shows analytics event: `[Analytics Event] signup_started`
- ✅ Console shows analytics event: `[Analytics Event] signup_completed {email: "test+free@testmail.app"}`

### Test 1.2: Email Verification
**Steps:**
1. Check backend console for OTP code (if using mock email client):
   - Look for: `[MOCK EMAIL OTP] To: test+free@testmail.app | Code: XXXXXX`
2. Enter the 6-digit OTP code
3. Click "Validate"

**Expected Results:**
- ✅ Helpful tips displayed on page for missing emails
- ✅ OTP validation succeeds
- ✅ Redirected to `/pricing`
- ✅ Console shows: `[Analytics Event] email_verification_started`
- ✅ Console shows: `[Analytics Event] email_verification_completed`

### Test 1.3: Free Plan Selection
**Steps:**
1. On pricing page, locate the "Free" plan card
2. Click "Select Plan" button on Free tier

**Expected Results:**
- ✅ Console shows: `[Analytics Event] plan_selection_viewed`
- ✅ Console shows: `[Analytics Event] free_plan_selected`
- ✅ Redirected to `/dashboard`
- ✅ Dashboard loads successfully
- ✅ Console shows: `[Analytics Event] dashboard_reached`

### Test 1.4: Verify User Status
**Steps:**
1. Check backend database or API response
2. Verify user status in profile

**Expected Results:**
- ✅ User status: `active`
- ✅ Subscription plan: `free`
- ✅ No errors in console

---

## Test Suite 2: Paid Plan Signup Flow (Stripe)

### Test 2.1: Account Creation
**Steps:**
1. Navigate to `http://localhost:5175/signup`
2. Fill in the signup form:
   - Email: `test+paid@testmail.app`
   - Password: `SecurePass123!`
   - Confirm Password: `SecurePass123!`
3. Check all three consent checkboxes
4. Click "Create account"

**Expected Results:**
- ✅ Same as Test 1.1

### Test 2.2: Email Verification
**Steps:**
- Same as Test 1.2

**Expected Results:**
- ✅ Same as Test 1.2

### Test 2.3: Paid Plan Selection
**Steps:**
1. On pricing page, select "Essential Monthly" or "Pro Monthly" plan
2. Click "Select Plan"

**Expected Results:**
- ✅ Console shows: `[Analytics Event] paid_plan_selected {plan: "essential_monthly"}`
- ✅ Console shows: `[Analytics Event] checkout_started {plan: "essential_monthly"}`
- ✅ Redirected to Stripe Checkout page
- ✅ Checkout URL contains session_id parameter

### Test 2.4: Stripe Payment (Test Mode)
**Steps:**
1. On Stripe checkout page, use test card:
   - Card Number: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
2. Click "Subscribe" or "Pay"

**Expected Results:**
- ✅ Payment processes successfully
- ✅ Redirected to `/checkout/success?session_id=cs_test_...`
- ✅ Success page shows "Verifying Your Payment" spinner
- ✅ Success page shows green checkmark with "Payment Successful!"
- ✅ Console shows: `[Analytics Event] checkout_completed {session_id: "cs_test_..."}`
- ✅ Automatically redirected to `/dashboard` after 1 second

### Test 2.5: Verify Subscription
**Steps:**
1. Check dashboard for active subscription
2. Navigate to `/settings` or `/pricing` to verify current plan

**Expected Results:**
- ✅ User status: `active`
- ✅ Subscription plan: `essential_monthly` or selected plan
- ✅ Dashboard shows: `[Analytics Event] dashboard_reached`

---

## Test Suite 3: Error Handling

### Test 3.1: Invalid OTP Code
**Steps:**
1. Complete signup and reach verification page
2. Enter incorrect OTP: `000000`
3. Click "Validate"

**Expected Results:**
- ✅ Error message displayed: "Invalid or expired code. Please request a new code and try again."
- ✅ Helpful tips remain visible
- ✅ No navigation occurs

### Test 3.2: Expired OTP Code
**Steps:**
1. Complete signup
2. Wait 11 minutes (OTP expires after 10 minutes)
3. Enter the expired OTP
4. Click "Validate"

**Expected Results:**
- ✅ Error message displayed about expiration
- ✅ "Resend Code" button remains functional

### Test 3.3: Resend OTP
**Steps:**
1. On verification page, click "Resend Code"

**Expected Results:**
- ✅ Success message: "A new verification code has been sent to your email..."
- ✅ Message includes spam folder reminder
- ✅ New OTP generated in backend logs

### Test 3.4: Stripe Checkout Failure
**Steps:**
1. Complete signup and verification
2. Select paid plan
3. On Stripe page, use declined test card: `4000 0000 0000 0002`
4. Attempt payment

**Expected Results:**
- ✅ Stripe shows error: "Your card was declined"
- ✅ User remains on Stripe checkout page
- ✅ Can retry with valid card

### Test 3.5: Stripe Session Verification Failure
**Steps:**
1. Manually navigate to: `/checkout/success?session_id=invalid_session`

**Expected Results:**
- ✅ Error UI displayed with red X icon
- ✅ Error message: "Failed to verify your payment..."
- ✅ Console shows: `[Analytics Event] checkout_failed {session_id: "invalid_session", error: "..."}`
- ✅ "Back to Pricing" and "Contact Support" buttons visible

---

## Test Suite 4: Protected Routes & Status Validation

### Test 4.1: Pending Verification Redirect
**Steps:**
1. Create account but don't verify email
2. Try to navigate directly to `/dashboard`

**Expected Results:**
- ✅ Automatically redirected to `/verify-email`
- ✅ Status check works correctly

### Test 4.2: Pending Plan Selection Redirect
**Steps:**
1. Create account and verify email
2. Don't select a plan
3. Try to navigate to `/dashboard`

**Expected Results:**
- ✅ Automatically redirected to `/pricing`
- ✅ Status check works correctly

### Test 4.3: Active User Access
**Steps:**
1. Complete full signup flow (free or paid)
2. Navigate to `/dashboard`, `/settings`, `/transactions`

**Expected Results:**
- ✅ All protected routes accessible
- ✅ No unwanted redirects
- ✅ User data loads correctly

---

## Test Suite 5: Analytics Tracking Verification

### Test 5.1: Check Console Events
**Steps:**
1. Complete an entire signup flow (free or paid)
2. Review browser console for all tracking events

**Expected Analytics Events (Free Plan):**
```
[Analytics Event] signup_started
[Analytics Event] signup_completed {email: "..."}
[Analytics Event] email_verification_started
[Analytics Event] email_verification_completed
[Analytics Event] plan_selection_viewed
[Analytics Event] free_plan_selected
[Analytics Event] dashboard_reached
```

**Expected Analytics Events (Paid Plan):**
```
[Analytics Event] signup_started
[Analytics Event] signup_completed {email: "..."}
[Analytics Event] email_verification_started
[Analytics Event] email_verification_completed
[Analytics Event] plan_selection_viewed
[Analytics Event] paid_plan_selected {plan: "..."}
[Analytics Event] checkout_started {plan: "..."}
[Analytics Event] checkout_completed {session_id: "..."}
[Analytics Event] dashboard_reached
```

---

## Test Suite 6: UI/UX Enhancements

### Test 6.1: Loading States
**Steps:**
1. During each async operation, observe UI

**Expected Results:**
- ✅ Signup button shows "Creating account..." while submitting
- ✅ Verify button shows "Verifying..." while checking OTP
- ✅ Pricing buttons show "Processing..." during selection
- ✅ Checkout success page shows spinner during verification
- ✅ Success page shows green checkmark after verification

### Test 6.2: Error Messages
**Steps:**
1. Trigger various error conditions

**Expected Results:**
- ✅ Clear, user-friendly error messages
- ✅ Specific guidance for OTP issues
- ✅ Helpful tips for missing emails
- ✅ Contact support suggestions for payment issues

### Test 6.3: Help Text
**Steps:**
1. Review verification page

**Expected Results:**
- ✅ Blue info box with troubleshooting tips
- ✅ Tips include: check spam, wait 1-2 minutes, resend option
- ✅ User's email displayed clearly

---

## Automated Test Execution

Run the automated test suite:

```bash
cd frontend
npm test
```

Expected output:
```
✓ src/tests/signupFlow.test.ts (15 tests) 5ms

Test Files  1 passed (1)
     Tests  15 passed (15)
```

---

## Troubleshooting

### Issue: OTP Email Not Received
**Solutions:**
- Check backend logs for OTP code (mock email client)
- Verify SMTP settings if using real email
- Use "Resend Code" button
- Check spam/junk folder

### Issue: Stripe Redirect Loop
**Solution:**
- ✅ FIXED: New `/checkout/success` page handles verification
- Ensure backend webhook is configured or verification endpoint works

### Issue: Analytics Not Tracking
**Solution:**
- Open browser console (F12)
- Check for errors in `eventTracking` service
- Verify imports in page components

### Issue: User Stuck on Pricing Page
**Solution:**
- ✅ FIXED: Checkout success now properly verifies payment
- Check browser console for errors
- Verify session_id in URL after Stripe redirect

---

## Production Checklist

Before deploying to production:

- [ ] Configure real SMTP server for email delivery
- [ ] Set up Stripe webhooks for payment confirmation
- [ ] Configure Google Analytics or analytics provider
- [ ] Test with real Stripe account (not test mode)
- [ ] Verify SSL certificates for checkout redirect
- [ ] Test email delivery with multiple email providers
- [ ] Monitor analytics dashboard for tracking accuracy
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Load test signup flow with multiple concurrent users

---

## Success Criteria

A successful signup flow implementation should demonstrate:

✅ **Functional Requirements:**
- Users can complete signup with valid credentials
- Email verification with OTP works correctly
- Free plan selection activates account
- Paid plan checkout redirects to Stripe
- Stripe payment verification succeeds
- Dashboard access granted after completion

✅ **Non-Functional Requirements:**
- All steps tracked with analytics events
- Loading states provide feedback
- Error messages are clear and helpful
- No infinite redirect loops
- Status transitions work correctly
- Protected routes enforce authentication
- UI is responsive and accessible

---

## Report Issues

If you encounter any issues during testing, please:

1. Check browser console for errors
2. Check backend logs for API errors
3. Document the exact steps to reproduce
4. Include screenshots if UI-related
5. Note any analytics events that fired (or didn't fire)
6. Create a GitHub issue with all details

---

**Last Updated:** 2025-12-21
**Test Suite Version:** 1.0
**Tested By:** Claude Sonnet 4.5
