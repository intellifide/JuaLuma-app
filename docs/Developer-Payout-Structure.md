# Developer Payout Structure
## jualuma Widget Marketplace - Intellifide, LLC

## Overview

This document defines the developer payout structure for the jualuma Widget Marketplace, including the Engagement Score formula, revenue share model, payment terms, and verification process. This structure is based on user engagement and verified ratings.


**Review Frequency:** Annually, or as business model evolves

**Related Documents:**
- `Intellifide, LLC business plan.md` - Business plan Section 6.3.1 (Developer Accountability)
- `Developer-Agreement-Template.md` - Developer agreement template (payout structure provisions)
- `Master App Dev Guide.md` - Technical specification (Section 2.4, Widget Marketplace)
- `Product-Roadmap.md` - Timeline for Widget Marketplace launch (Phase 1.2)
- `Compliance-Checklist.md` - Compliance requirements for developer program

---

## 1. Payout Model Overview

### 1.1 Engagement-Based Revenue

**Core Principle:**
Developer earnings are based on **User Engagement** and **Verified Ratings**, creating incentives for high-quality widgets that provide value to users.

**Key Components:**
- **Downloads:** Number of times widget is downloaded/installed
- **Ratings:** User ratings on 1-5 star scale
- **Engagement Score:** Calculated formula combining downloads and ratings
- **Revenue Share:** Percentage of revenue allocated to developers

### 1.2 Quality Signal

**Ratings as Quality Signal:**
- User ratings (1-5 stars) serve as quality indicator
- Higher ratings = higher Engagement Score
- Encourages developers to create quality widgets
- Creates positive feedback loop (better widgets earn more)

---

## 2. Engagement Score Formula

### 2.1 Formula Definition

**Engagement Score = Downloads × Average Rating Score**

**Where:**
- **Downloads:** Total number of widget downloads/installations
- **Average Rating Score:** Average of all verified user ratings (1-5 scale)

### 2.2 Formula Examples

**Example 1: High-Quality Widget**
- Downloads: 1,000
- Average Rating: 4.8 stars
- Engagement Score = 1,000 × 4.8 = **4,800**

**Example 2: Popular but Lower Quality**
- Downloads: 2,000
- Average Rating: 3.2 stars
- Engagement Score = 2,000 × 3.2 = **6,400**

**Example 3: New Widget**
- Downloads: 50
- Average Rating: 5.0 stars
- Engagement Score = 50 × 5.0 = **250**

### 2.3 Formula Rationale

**Why Downloads × Ratings:**
- Rewards both popularity (downloads) and quality (ratings)
- Prevents low-quality widgets from earning based solely on downloads
- Encourages developers to maintain quality
- Creates natural quality filter

**Why Not Other Formulas:**
- Downloads alone: Rewards quantity over quality
- Ratings alone: Doesn't account for adoption
- Downloads + Ratings: Doesn't weight quality enough
- Downloads × Ratings: Best balance of both factors

---

## 3. Revenue Share Model

### 3.1 Revenue Share Structure

**Revenue Pool:**
- Total revenue from Pro Tier subscriptions
- Or dedicated widget marketplace revenue (if separate)
- Allocation method: [To be determined - e.g., 70% to developers, 30% to Company]

**Distribution Method:**
- Revenue distributed based on Engagement Score proportion
- Each developer receives share proportional to their Engagement Score
- Total Engagement Scores determine distribution percentages

### 3.2 Revenue Share Calculation

**Step 1: Calculate Total Engagement Score**
- Sum all developers' Engagement Scores
- Example: Developer A (4,800) + Developer B (6,400) + Developer C (250) = 11,450

**Step 2: Calculate Developer Share Percentage**
- Developer Share = (Developer Engagement Score / Total Engagement Score) × 100%
- Example: Developer A = (4,800 / 11,450) × 100% = 41.9%

**Step 3: Calculate Developer Payout**
- Developer Payout = Total Revenue Pool × Developer Share Percentage
- Example: If revenue pool = $10,000, Developer A = $10,000 × 41.9% = $4,190

### 3.3 Revenue Share Example

**Monthly Revenue Pool:** $10,000

**Developers and Engagement Scores:**
- Developer A: 4,800 Engagement Score
- Developer B: 6,400 Engagement Score
- Developer C: 250 Engagement Score
- **Total:** 11,450 Engagement Score

**Payouts:**
- Developer A: ($10,000 × 4,800 / 11,450) = **$4,190.39**
- Developer B: ($10,000 × 6,400 / 11,450) = **$5,589.52**
- Developer C: ($10,000 × 250 / 11,450) = **$218.34**

---

## 4. Payment Terms

### 4.1 Payment Schedule

**Frequency:**
- Monthly payouts (recommended)
- Or quarterly payouts (alternative)

**Calculation Period:**
- Engagement Score calculated for previous month
- Revenue share calculated based on monthly Engagement Scores
- Payouts processed within 15 days of period end

**Example Timeline:**
- January 1-31: Engagement period
- February 1-5: Engagement Score calculation
- February 6-10: Revenue share calculation
- February 15: Payout processed

### 4.2 Minimum Payout Threshold

**Threshold:**
- Minimum payout: $50 (recommended)
- Payouts below threshold accumulate
- Payout when threshold reached or account closed

**Rationale:**
- Reduces payment processing costs
- Prevents micro-payments
- Encourages developer engagement

### 4.3 Payment Methods

**Supported Methods:**
- Stripe Connect (recommended)
- ACH transfer
- Wire transfer (for large amounts)
- Other methods (to be determined)

**Payment Processing:**
- Payments processed through verified payment method
- Developer must complete identity verification
- Payment information stored securely
- Payment processing fees: [To be determined - may be deducted from payout]

---

## 5. Verification Process

### 5.1 Identity Verification

**Required for Payouts:**
- Developer must complete identity verification
- Government-issued ID verification
- Business entity verification (if applicable)
- Address verification
- Tax information (W-9 or W-8BEN)

**Verification Process:**
1. Developer initiates verification
2. Submit required documents
3. Verification reviewed
4. Verification approved or rejected
5. Developer notified of status

**Ongoing Verification:**
- Verification status maintained
- Updates required if information changes
- Re-verification may be required periodically

### 5.2 Rating Verification

**Rating Integrity:**
- Ratings must be from verified users
- Fraudulent ratings detected and removed
- Rating manipulation prohibited
- Ratings immutable (written to the Cloud SQL audit ledger)

**Verification Methods:**
- User must be authenticated
- User must have used widget
- One rating per user per widget
- Ratings reviewed for fraud patterns

---

## 6. Data Tracking and Immutability

### 6.1 Downloads Tracking

**Tracking Requirements:**
- Downloads tracked immutably
- Logged to Cloud SQL audit ledger for audit trail
- Timestamp recorded
- User ID recorded (for fraud prevention)
- Cannot be modified or deleted

**Tracking Implementation:**
- Download event logged immediately
- Event stored in Firestore (widget_engagement collection)
- Event also written to the Cloud SQL audit ledger (audit trail)
- Real-time counter updates

### 6.2 Ratings Tracking

**Tracking Requirements:**
- Ratings tracked immutably
- Logged to Cloud SQL audit ledger for audit trail
- Timestamp recorded
- User ID recorded
- Rating value recorded
- Cannot be modified or deleted

**Tracking Implementation:**
- Rating event logged immediately
- Event stored in Firestore (widget_engagement collection)
- Event also written to the Cloud SQL audit ledger (audit trail)
- Average rating calculated in real-time

### 6.3 Engagement Score Calculation

**Calculation Method:**
- Downloads: Sum from widget_engagement table
- Average Rating: Calculated from verified ratings
- Engagement Score: Downloads × Average Rating
- Calculated monthly for payout period

**Calculation Frequency:**
- Real-time: For display purposes
- Monthly: For payout calculations
- Stored: In developer_payouts table

---

## 7. Payout Calculation Service

### 7.1 Service Overview

**Service Name:** Payout Calculation Service

**Function:**
- Executes monthly (or as configured)
- Calculates Engagement Scores for all widgets
- Determines revenue share for each developer
- Creates ledger entries in developer_payouts table
- Triggers payout processing

### 7.2 Calculation Process

**Step 1: Data Collection**
- Retrieve download counts from Firestore
- Retrieve ratings from Firestore
- Calculate average ratings
- Calculate Engagement Scores

**Step 2: Revenue Allocation**
- Determine total revenue pool
- Calculate total Engagement Score
- Calculate each developer's share percentage
- Calculate each developer's payout amount

**Step 3: Ledger Creation**
- Create entries in developer_payouts table
- Record: month, dev_uid, gross_revenue, payout_status
- Status: 'pending' initially

**Step 4: Payout Processing**
- Transfer to payment processor (Stripe Connect)
- Update payout_status to 'paid'
- Notify developers
- Generate payout reports

### 7.3 Service Implementation

**Technology:**
- Cloud Run Job (scheduled monthly)
- Python service
- Accesses Firestore, Cloud SQL
- Integrates with Stripe Connect

**Scheduling:**
- Cloud Scheduler triggers monthly
- Runs on 1st of month (for previous month)
- Or runs on configurable schedule

---

## 8. Developer Portal

### 8.1 Payout Information Access

**Endpoint:** GET /dev/payouts

**Returns:**
- Payment history
- Current earnings (pending)
- Engagement Score for each widget
- Download and rating statistics
- Payout schedule and status

### 8.2 Dashboard Features

**Developer Dashboard Should Show:**
- Total Engagement Score
- Engagement Score by widget
- Download counts
- Average ratings
- Revenue share percentage
- Payout history
- Pending payouts
- Payment method information

---

## 9. Fraud Prevention

### 9.1 Download Fraud Prevention

**Measures:**
- One download per user per widget
- Authenticated users only
- Rate limiting on download events
- Anomaly detection
- Manual review of suspicious patterns

### 9.2 Rating Fraud Prevention

**Measures:**
- One rating per user per widget
- Authenticated users only
- User must have used widget
- Anomaly detection (suspicious rating patterns)
- Manual review of suspicious ratings
- Fraudulent ratings removed
- Developers penalized for manipulation

### 9.3 Monitoring and Detection

**Automated Monitoring:**
- Unusual download patterns detected
- Unusual rating patterns detected
- Suspicious activity flagged
- Automated alerts generated

**Manual Review:**
- Flagged activity reviewed
- Fraud confirmed or cleared
- Appropriate action taken
- Developers notified of violations

---

## 10. Dispute Resolution

### 10.1 Payout Disputes

**Dispute Types:**
- Calculation errors
- Missing payouts
- Rating disputes
- Download disputes

**Dispute Process:**
1. Developer submits dispute
2. Dispute reviewed
3. Data verified
4. Resolution determined
5. Developer notified
6. Correction made if needed

### 10.2 Appeal Process

**If Developer Disagrees:**
- Developer can appeal decision
- Additional review conducted
- Final determination made
- Developer notified

---

## 11. Tax and Legal Considerations

### 11.1 Tax Reporting

**1099 Requirements:**
- Issue 1099-NEC if payout > $600/year
- Collect W-9 from US developers
- Collect W-8BEN from international developers
- Report to IRS as required

### 11.2 Legal Compliance

**Contractual Requirements:**
- Developer Agreement executed
- IP assignment confirmed
- Identity verified
- Payment terms agreed

---

## 12. Payout Structure Summary

### 12.1 Key Metrics

**Engagement Score Formula:**
Engagement Score = Downloads × Average Rating Score

**Revenue Share:**
Developer Payout = (Developer Engagement Score / Total Engagement Score) × Total Revenue Pool

**Payment Terms:**
- Frequency: Monthly
- Minimum: $50
- Processing: Within 15 days of period end

### 12.2 Example Calculation

**Scenario:**
- Monthly Revenue Pool: $10,000
- Developer A: 1,000 downloads, 4.5 avg rating = 4,500 Engagement Score
- Developer B: 500 downloads, 5.0 avg rating = 2,500 Engagement Score
- Total Engagement Score: 7,000

**Payouts:**
- Developer A: ($10,000 × 4,500 / 7,000) = **$6,428.57**
- Developer B: ($10,000 × 2,500 / 7,000) = **$3,571.43**

---

## 13. Implementation Notes

### 13.1 Technical Implementation

**Required Components:**
- Payout Calculation Service (Cloud Run Job)
- developer_payouts table (Cloud SQL)
- widget_engagement collection (Firestore)
- Stripe Connect integration
- Developer portal (GET /dev/payouts endpoint)

### 13.2 Data Integrity

**Critical Requirements:**
- Downloads and ratings must be immutable
- Logged to the Cloud SQL audit ledger for audit
- Cannot be modified or deleted
- Real-time calculation for display
- Monthly calculation for payouts

---

## 14. Appendices

### Appendix A: Engagement Score Calculation Examples

[Detailed calculation examples]

### Appendix B: Payout Calculation Service Specification

[Technical specification for the service]

### Appendix C: Developer Portal Mockups

[UI/UX specifications for developer portal]

---


**Next Review:** After marketplace launch, or as business model evolves

**Maintained By:** Product Team / Finance Team

---

**Note:** This payout structure should be reviewed and approved before implementation. Revenue share percentages and payment terms may need adjustment based on business model and market conditions.

**Last Updated:** December 05, 2025 at 01:34 AM
