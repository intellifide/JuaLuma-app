# Compliance Checklist

## Intellifide, LLC - jualuma Platform

## Overview

This document consolidates all compliance requirements for Intellifide, LLC and the jualuma platform, including GLBA, CCPA, FinCEN, SEC, and Texas tax compliance. This checklist should be reviewed regularly to ensure ongoing compliance.

**Review Frequency:** Quarterly, or as regulations change

**Related Documents:**

- `WISP-Framework.md` - Security program framework (Section 1.2)
- `IRP-Framework.md` - Incident response framework (Section 1.2)
- `Risk-Assessment-Process.md` - Risk assessment procedures (Section 1.2)
- `Program-Coordinator-Role.md` - Program Coordinator role (Section 1.2)
- `Intellifide, LLC business plan.md` - Business plan Section 6 (Legal & Regulatory Compliance)
- `Product-Roadmap.md` - Timeline for compliance activities
- `Terms-of-Service-Draft.md` - Terms of Service (Section 8.1)
- `Privacy-Policy-Draft.md` - Privacy Policy (Section 8.1)
- `AI-Assistant-Disclaimer.md` - AI disclaimer (Section 4.1)
- `Developer-Agreement-Template.md` - Developer agreements (Section 8.1)
- `Security-Architecture.md` - Security architecture (implementation)
- `Vendor-Relationships.md` - Vendor management (Section 1.2)

---

## 1. GLBA (Gramm-Leach-Bliley Act) Compliance

### 1.1 Privacy Rule (Reg P) Requirements

- [ ] **Initial Privacy Notice**
  - Provided to customers when account is created
  - Includes information sharing practices
  - Includes opt-out rights (if applicable)
  - Documented delivery

- [ ] **Annual Privacy Notice**
  - Provided to all customers annually
  - Updated if privacy practices change materially
  - Delivery method documented
  - Retention of notices

- [ ] **Privacy Policy**
  - Comprehensive privacy policy published
  - Accessible from Service
  - Reviewed and approved by legal counsel
  - Updated as needed

- [ ] **Opt-Out Rights**
  - Procedures for customers to opt-out
  - Honoring opt-out requests
  - Documentation of opt-outs
  - No discrimination for opt-out

### 1.2 Safeguards Rule Requirements

- [ ] **Written Information Security Program (WISP)**
  - WISP framework created (see WISP-Framework.md)
  - WISP implemented and maintained
  - WISP reviewed annually
  - Updates documented

- [ ] **Program Coordinator**
  - Program Coordinator designated
  - Qualifications verified
  - Responsibilities defined
  - Reporting structure established

- [ ] **Risk Assessment**
  - Initial risk assessment completed
  - Annual risk assessments conducted
  - Risk register maintained
  - Mitigation actions tracked

- [ ] **Incident Response Plan (IRP)**
  - IRP framework created (see IRP-Framework.md)
  - IRP implemented and maintained
  - IRP tested regularly
  - 30-day FTC breach notification process documented

- [ ] **Access Controls**
  - Multi-factor authentication implemented
  - Role-based access controls
  - Quarterly access reviews
  - Access revocation procedures

- [ ] **Encryption**
  - Data encrypted at rest (AES-256)
  - Data encrypted in transit (TLS 1.3)
  - Encryption keys managed securely (KMS)
  - Encryption verified regularly

- [ ] **Monitoring and Logging**
  - Security monitoring implemented
  - Logs retained (minimum 1 year, critical logs 7 years)
  - Log access restricted
  - Log reviews conducted regularly

- [ ] **Vendor Management**
  - Vendor security assessments conducted
  - Data Processing Agreements executed
  - Vendor compliance monitored
  - Vendor incidents tracked

- [ ] **Employee Training**
  - Initial security training provided
  - Annual security awareness training
  - Training completion tracked
  - Training updated as needed

---

## 2. CCPA (California Consumer Privacy Act) Compliance

### 2.1 Privacy Policy Requirements

- [ ] **Privacy Policy Disclosures**
  - Categories of personal information collected
  - Sources of personal information
  - Business purposes for use
  - Third-party sharing practices
  - Consumer rights information

- [ ] **Right to Know**
  - Procedures for access requests
  - Response within 45 days (may extend to 90)
  - Verification of identity
  - Delivery of information

- [ ] **Right to Delete**
  - Procedures for deletion requests
  - Response within 45 days (may extend to 90)
  - Verification of identity
  - Exceptions documented
  - Deletion confirmed

- [ ] **Right to Opt-Out**
  - Opt-out procedures (if selling/sharing)
  - Clear opt-out mechanism
  - Honoring opt-out requests
  - No discrimination for opt-out

- [ ] **Non-Discrimination**
  - No discrimination for exercising rights
  - Equal service regardless of privacy choices
  - No denial of goods or services
  - No price differences

### 2.2 CCPA Baseline for All States

- [ ] **Apply CCPA Standards**
  - Use CCPA as baseline for all personal information
  - Not limited to California residents
  - Consistent privacy practices
  - Regular compliance reviews

---

## 3. FinCEN (Financial Crimes Enforcement Network) Compliance

### 3.1 Non-MSB Status Maintenance

- [ ] **Read-Only Architecture**
  - Platform architected as read-only
  - No transaction initiation capability
  - No fund movement capability
  - No custody of customer funds

- [ ] **Scope Enforcement**
  - Only read/view scopes used with financial APIs
  - Trade/move/withdraw scopes blocked
  - Validation middleware implemented
  - Regular audits of API scopes

- [ ] **Legal Opinion**
  - Specialized counsel engaged
  - Formal legal opinion on data flow
  - Opinion reviewed and documented
  - Opinion updated as needed

- [ ] **Documentation**
  - Architecture documented as read-only
  - API scope restrictions documented
  - Compliance measures documented
  - Regular reviews conducted

### 3.2 OFAC (Office of Foreign Assets Control) Compliance

- [ ] **Sanctions Screening**
  - Wallet address screening implemented
  - OFAC SDN list checking
  - Screening before data sync
  - Flagged accounts handled appropriately

- [ ] **Compliance Service**
  - ComplianceService implemented
  - OFAC screening logic
  - Account flagging procedures
  - Service suspension (no fund blocking)

---

## 4. SEC (Securities and Exchange Commission) Compliance

### 4.1 Non-Investment Adviser Strategy

- [ ] **Disclaimer Implementation**
  - AI Assistant disclaimer created (see AI-Assistant-Disclaimer.md)
  - Disclaimer displayed and accepted
  - Click-wrap acceptance required
  - Disclaimer reviewed by legal counsel

- [ ] **Terms of Service**
  - Terms of Service include AI disclaimer
  - No financial advice language
  - Clear limitations on Service
  - Terms reviewed by legal counsel

- [ ] **Marketing Compliance**
  - Marketing content guidelines followed
  - No investment advice language
  - No predictions or forecasts
  - Regular content reviews

- [ ] **Legal Review**
  - SEC compliance strategy reviewed by counsel
  - Disclaimer sufficiency verified
  - Ongoing legal oversight
  - Regular compliance reviews

### 4.2 Ongoing Monitoring

- [ ] **Feature Review**
  - All new features reviewed for SEC implications
  - Legal approval before features that could trigger IA status
  - No "sending," "swapping," or "rebalancing" without approval
  - Feature compliance documented

---

## 5. Texas Tax Compliance

### 5.1 Sales Tax

- [ ] **Sales Tax Permit**
  - Texas Sales Tax Permit obtained
  - Permit number documented
  - Permit renewed as required

- [ ] **Tax Collection**
  - Sales tax collected from Texas customers
  - 80% taxable basis applied (20% exemption)
  - Tax calculation verified
  - Stripe Tax configured correctly

- [ ] **Tax Remittance**
  - Tax returns filed on schedule (monthly/quarterly)
  - Taxes remitted timely
  - Records maintained (4 years minimum)
  - Compliance verified

### 5.2 Franchise Tax

- [ ] **Franchise Tax Registration**
  - Franchise tax account number received
  - Registration confirmed
  - Account number documented

- [ ] **Annual Filing**
  - Annual franchise tax report filed (May 15)
  - Filed even if no tax liability
  - Filing completed timely
  - Records maintained

### 5.3 Tax Documentation

- [ ] **Records Maintained**
  - Sales records maintained
  - Tax calculation documentation
  - Filing records retained
  - Audit trail maintained

---

## 6. Data Privacy and Security

### 6.1 Data Minimization

- [ ] **Data Collection**
  - Only necessary data collected
  - Data minimization principles followed
  - Unnecessary data not collected
  - Regular data collection reviews

- [ ] **Data Retention**
  - Retention policies established
  - Data deleted when no longer needed
  - Retention periods documented
  - Regular data purging

### 6.2 Right to be Forgotten

- [ ] **GDPR/CCPA Compliance**
  - Deletion procedures implemented
  - User DEK lifecycle managed
  - Cryptographic erasure procedures
  - Physical data deletion (24 hours after key destruction)
  - Deletion confirmed to users

### 6.3 Data Breach Notification

- [ ] **30-Day FTC Rule**
  - 30-day notification process documented
  - Notification procedures tested
  - Customer notification procedures
  - Regulatory notification procedures
  - Law enforcement notification (if needed)

### 6.4 Feature Preview Program Controls

- [ ] **Synthetic Preview Data**
  - Preview datasets sourced only from approved `preview-data/` fixtures
  - No NPPI, transaction history, or customer identifiers reused
  - Preview payloads labeled `isPreview: true` and segregated from production storage
- [ ] **Disclosure Language**
  - Overlay banner + paywall modal clearly state that preview information is illustrative
  - Texas SaaS tax disclosure included whenever prices are shown
  - Messaging reviewed by legal/marketing before release
- [ ] **Telemetry Minimization**
  - Preview analytics stores hashed UID + tier only
  - Events logged for the minimum retention period needed for KPIs
  - Access to preview telemetry restricted to Growth + Compliance teams
- [ ] **Kill Switch & Audit**
  - Remote Config kill switch documented and tested quarterly
  - Audit logs retained for preview interactions (blocked + allowed)
  - Support procedures cover disabling preview features during an incident

### 6.5 Mobile App Store Disclosures

- [ ] **Apple Privacy Nutrition Label**
  - Data categories mapped directly to `compliance/privacy_manifest.json`
  - Label updated whenever collection scope or retention changes
  - Review documented before each App Store submission
- [ ] **App Tracking Transparency (ATT) Prompt**
  - Prompt copy matches `Marketing-Content-Guidelines.md`
  - No incentives or gating behind tracking consent
  - Logging proves ATT prompt is displayed prior to accessing IDFA
- [ ] **Google Play Data Safety**
  - `android/play-data-safety.yaml` maintained with current data flows
  - Play Console form updated in sync with product changes
  - Exported PDF stored with compliance evidence
- [ ] **Store Listing Compliance**
  - Listings cite Intellifide, LLC as the legal entity and reiterate read-only service positioning
  - App icons, screenshots, and promotional assets vetted for GLBA/SEC compliance (no financial advice language)
  - TestFlight and Play testing release notes reviewed for compliance before distribution

---

## 7. Intellectual Property

### 7.1 IP Protection

- [ ] **Trademark Strategy**
  - Trademark filing strategy created
  - Classes 9, 36, 42, 41 identified
  - Filing timeline established
  - Maintenance schedule documented

- [ ] **IP Assignment**
  - Developer agreements include IP assignment
  - IP assignment clause non-negotiable
  - All agreements reviewed by legal counsel
  - IP ownership documented

### 7.2 Trade Secrets

- [ ] **Trade Secret Protection**
  - Core algorithms protected as trade secrets
  - Confidentiality agreements in place
  - Access controls implemented
  - Trade secret documentation

---

## 8. Legal Documentation

### 8.1 Required Documents

- [ ] **Terms of Service**
  - Terms of Service draft created
  - Reviewed and approved by legal counsel
  - Published and accessible
  - Updated as needed

- [ ] **Privacy Policy**
  - Privacy Policy draft created
  - Reviewed and approved by legal counsel
  - Published and accessible
  - Updated as needed

- [ ] **Developer Agreement**
  - Developer Agreement template created
  - Reviewed and approved by legal counsel
  - Used for all developer agreements
  - Updated as needed

- [ ] **AI Assistant Disclaimer**
  - AI Assistant Disclaimer created
  - Reviewed and approved by legal counsel
  - Implemented in Service
  - Updated as needed

### 8.2 Legal Review Requirements

- [ ] **Attorney Review**
  - All legal documents reviewed by counsel
  - Attorney approval obtained before publication
  - Ongoing legal oversight maintained
  - Legal counsel consulted for regulatory decisions

---

## 9. Ongoing Compliance Maintenance

### 9.1 Regular Reviews

- [ ] **Quarterly Compliance Review**
  - Compliance checklist reviewed
  - Gaps identified and addressed
  - Documentation updated
  - Management notified

- [ ] **Annual Compliance Assessment**
  - Comprehensive compliance review
  - All requirements verified
  - Improvements identified
  - Compliance report created

### 9.2 Regulatory Monitoring

- [ ] **Regulatory Updates**
  - Monitor for regulatory changes
  - Update compliance measures as needed
  - Update documentation
  - Train team on changes

- [ ] **Industry Best Practices**
  - Monitor industry best practices
  - Implement improvements
  - Stay current with standards
  - Benchmark against peers

---

## 10. Compliance Documentation

### 10.1 Required Documentation

- [ ] **WISP Documentation**
  - WISP framework maintained
  - Implementation documented
  - Annual reviews documented
  - Updates tracked

- [ ] **IRP Documentation**
  - IRP framework maintained
  - Incident responses documented
  - Testing documented
  - Updates tracked

- [ ] **Risk Assessment Documentation**
  - Risk assessments documented
  - Risk register maintained
  - Mitigation actions tracked
  - Reports retained

- [ ] **Training Documentation**
  - Training provided documented
  - Completion tracked
  - Training materials retained
  - Updates documented

### 10.2 Record Retention

- [ ] **Retention Policies**
  - Retention periods established
  - Records retained per requirements
  - Secure storage maintained
  - Disposal procedures followed

---

## 11. Compliance Reporting

### 11.1 Internal Reporting

- [ ] **Management Reports**
  - Quarterly compliance status reports
  - Annual compliance assessment reports
  - Incident reports (as needed)
  - Gap analysis reports

### 11.2 External Reporting

- [ ] **Regulatory Filings**
  - Required regulatory filings completed
  - Filed timely and accurately
  - Documentation retained
  - Follow-up as needed

---

## 12. Compliance Checklist Summary

### 12.1 Status Tracking

**Compliance Areas:**

- GLBA Compliance: [ ] Complete  [ ] In Progress  [ ] Not Started
- CCPA Compliance: [ ] Complete  [ ] In Progress  [ ] Not Started
- FinCEN Compliance: [ ] Complete  [ ] In Progress  [ ] Not Started
- SEC Compliance: [ ] Complete  [ ] In Progress  [ ] Not Started
- Texas Tax Compliance: [ ] Complete  [ ] In Progress  [ ] Not Started
- Data Privacy: [ ] Complete  [ ] In Progress  [ ] Not Started
- Legal Documentation: [ ] Complete  [ ] In Progress  [ ] Not Started

### 12.2 Priority Actions

[List top 5 priority compliance items]

1. [Priority item 1]
2. [Priority item 2]
3. [Priority item 3]
4. [Priority item 4]
5. [Priority item 5]

---

## 13. Appendices

### Appendix A: Compliance Calendar

[Calendar of compliance deadlines and review dates]

### Appendix B: Regulatory Contacts

[Contact information for regulatory agencies]

### Appendix C: Compliance Resources

[Links to regulatory resources and guidance]

---

**Next Review:** February 14, 2026

**Maintained By:** Program Coordinator

---

**Note:** This checklist should be reviewed quarterly and updated as compliance requirements change. All compliance activities must be documented and retained for audit purposes.

**Last Updated:** December 19, 2025 at 01:50 PM CT (Modified 12/19/2025 13:50 Central Time per rules)
