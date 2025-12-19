import React from 'react';
import { Link } from 'react-router-dom';

export const Terms = () => {
    return (
        <div>
            <section className="container max-w-[800px] py-12">
                <div className="glass-panel">
                    <h1 className="mb-4">Terms of Service</h1>
                    <p className="text-text-secondary mb-8 text-sm">
                        <strong>Last Updated:</strong> January 15, 2025
                    </p>

                    <div className="max-w-[800px] mx-auto space-y-6">
                        <h2>1. Acceptance of Terms</h2>

                        <h3>1.1 Agreement to Terms</h3>
                        <p>By accessing or using the jualuma platform (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not access or use the Service.</p>

                        <h3>1.2 Click-Wrap Agreement</h3>
                        <p>These Terms constitute a legal contract between you and Intellifide, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By clicking &quot;I Agree&quot; or similar acceptance mechanism, you acknowledge that you have read, understood, and agree to be bound by these Terms.</p>

                        <h3>1.3 Modifications to Terms</h3>
                        <p>We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on the Service or by email. Your continued use of the Service after such modifications constitutes your acceptance of the modified Terms.</p>

                        <h3>1.4 Eligibility</h3>
                        <p>You must be at least 18 years old and have the legal capacity to enter into contracts to use the Service. By using the Service, you represent and warrant that you meet these eligibility requirements.</p>

                        <h2>2. Description of Service</h2>

                        <h3>2.1 Service Description</h3>
                        <p>jualuma is a financial aggregation and analysis platform that allows you to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Securely connect and aggregate financial accounts (banks, credit cards, cryptocurrency exchanges, Web3 wallets)</li>
                            <li>Automatically categorize and analyze financial transactions</li>
                            <li>View financial health metrics and reports</li>
                            <li>Access AI-powered financial analysis tools</li>
                            <li>Receive educational content about personal finance</li>
                        </ul>

                        <h3>2.2 Service Limitations</h3>
                        <p>The Service is designed as a <strong>read-only data analysis tool</strong>. The Service:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Does NOT provide financial advice, recommendations, or forecasts</li>
                            <li>Does NOT execute financial transactions</li>
                            <li>Does NOT hold, custody, or control your funds</li>
                            <li>Does NOT provide investment, tax, or legal advice</li>
                            <li>Is for informational and educational purposes only</li>
                        </ul>

                        <h3>2.3 Service Availability</h3>
                        <p>We strive to provide continuous availability of the Service but do not guarantee uninterrupted access. The Service may be unavailable due to maintenance, updates, or circumstances beyond our control.</p>

                        <h2>3. User Accounts and Registration</h2>

                        <h3>3.1 Account Creation</h3>
                        <p>To use the Service, you must create an account by providing accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials.</p>

                        <h3>3.2 Account Security</h3>
                        <p>You are responsible for:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Maintaining the security of your account</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized access</li>
                            <li>Using strong, unique passwords</li>
                            <li>Enabling multi-factor authentication when available</li>
                        </ul>

                        <h3>3.3 Account Termination</h3>
                        <p>We reserve the right to suspend or terminate your account at any time, with or without notice, for violation of these Terms or for any other reason we deem necessary to protect the Service or other users.</p>

                        <h2>4. Financial Account Linking</h2>

                        <h3>4.1 Account Linking</h3>
                        <p>The Service allows you to link financial accounts through read-only API connections and OAuth protocols. By linking accounts, you authorize us to access account information on your behalf.</p>
                        <h3>4.2 Read-Only Access</h3>
                        <p>All account connections are <strong>read-only</strong>. We do not have the ability to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Initiate transactions</li>
                            <li>Transfer funds</li>
                            <li>Withdraw money</li>
                            <li>Modify account settings</li>
                            <li>Execute trades or investments</li>
                        </ul>

                        <h3>4.3 Third-Party Services</h3>
                        <p>Account linking is provided through third-party services (e.g., Plaid, CEX APIs). Your use of these services is subject to their respective terms of service and privacy policies.</p>

                        <h3>4.6 Feature Preview Content</h3>
                        <p>Certain areas of the Service may display <strong>&quot;Preview Mode&quot;</strong> interfaces that showcase premium workflows, dashboards, automations, or AI transcripts. Preview content:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Uses synthetic, illustrative data that is not derived from your linked accounts;</li>
                            <li>Is presented for marketing and educational purposes only;</li>
                            <li>May block interactions, submissions, or data entry to prevent unintended activity; and</li>
                            <li>Does not create any advisory, fiduciary, or agency relationship between you and Intellifide, LLC.</li>
                        </ul>
                        <p>You must not rely on preview content for financial planning or decision-making, and you acknowledge that any upgrade prompts associated with Preview Mode are invitations to subscribe—not offers of financial advice.</p>

                        <h2>5. AI Assistant Disclaimer</h2>

                        <h2>5. AI Assistant Disclaimer</h2>

                        <h3>5.1 AI Assistant (Insights) Disclaimers - "AS IS"</h3>
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg p-4 my-4">
                            <strong>WARNING: The jualuma AI Assistant ("Insights") provides informational summaries generated by third-party large language models. Illusions, "hallucinations," and inaccuracies are possible. jualuma Insights do not constitute financial, investment, tax, or legal advice.</strong>
                            <br /><br />
                            <strong>YOU ACKNOWLEDGE THAT YOU SHOULD NOT RELY ON AI-GENERATED OUTPUTS FOR CRITICAL FINANCIAL DECISIONS. always verify data against your official bank or institution records.</strong>
                        </div>

                        <h3>5.2 Unrestricted Access</h3>
                        <p>The AI Assistant provides direct, unrestricted pass-through to third-party Large Language Models (LLMs). We do not filter or restrict user queries or model responses.</p>

                        <h3>5.3 No Financial Advice</h3>
                        <p>The AI Assistant:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Does NOT provide financial advice</li>
                            <li>Does NOT provide investment recommendations</li>
                            <li>Does NOT provide tax advice</li>
                            <li>Does NOT provide legal advice</li>
                            <li>Is for informational and educational purposes only</li>
                        </ul>

                        <h3>5.4 User Responsibility</h3>
                        <p>You acknowledge that:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>AI-generated content may be inaccurate or inappropriate</li>
                            <li>You should not rely on AI responses for financial decisions</li>
                            <li>You should consult qualified professionals for financial, investment, tax, or legal advice</li>
                            <li>You use the AI Assistant at your own risk</li>
                        </ul>

                        <h3>5.5 Liability Disclaimer</h3>
                        <p>Intellifide, LLC is not liable for any decisions you make based on AI Assistant responses. All liability is disclaimed as set forth in Section 10 (Limitation of Liability).</p>

                        <h2>6. User Obligations and Prohibited Uses</h2>

                        <h3>6.1 Acceptable Use</h3>
                        <p>You agree to use the Service only for lawful purposes and in accordance with these Terms.</p>

                        <h3>6.2 Prohibited Uses</h3>
                        <p>You agree NOT to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Use the Service for any illegal purpose or in violation of any laws</li>
                            <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
                            <li>Interfere with or disrupt the Service or servers</li>
                            <li>Use automated systems to access the Service without authorization</li>
                            <li>Reverse engineer, decompile, or disassemble the Service</li>
                            <li>Copy, modify, or create derivative works of the Service</li>
                            <li>Remove or alter any copyright, trademark, or proprietary notices</li>
                            <li>Use the Service to transmit viruses, malware, or harmful code</li>
                            <li>Impersonate any person or entity</li>
                            <li>Collect or harvest information about other users</li>
                            <li>Use the Service in any manner that could damage, disable, or impair the Service</li>
                        </ul>

                        <h3>6.3 Account Limits</h3>
                        <p>Your use of the Service is subject to account limits based on your subscription tier (Free, Essential, Pro, or Ultimate). Limits may include:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Number of linked accounts</li>
                            <li>Number of Web3 wallets</li>
                            <li>AI query quotas</li>
                            <li>Feature availability</li>
                        </ul>

                        <h2>7. Intellectual Property</h2>

                        <h3>7.1 Service Ownership</h3>
                        <p>The Service, including all content, features, functionality, software, and technology, is owned by Intellifide, LLC and is protected by copyright, trademark, and other intellectual property laws.</p>

                        <h3>7.2 User Content</h3>
                        <p>You retain ownership of any content you provide to the Service. By providing content, you grant us a license to use, store, and process that content to provide the Service.</p>

                        <h3>7.3 Trademarks</h3>
                        <p>&quot;jualuma&quot; and related logos and marks are trademarks of Intellifide, LLC. You may not use our trademarks without our prior written permission.</p>

                        <h2>8. Privacy and Data Protection</h2>

                        <h3>8.1 Privacy Policy</h3>
                        <p>Your use of the Service is also governed by our <Link to="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand how we collect, use, and protect your information.</p>

                        <h3>8.2 Data Security</h3>
                        <p>We implement industry-standard security measures to protect your information. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>

                        <h3>8.3 Third-Party Data</h3>
                        <p>We rely on third-party services to access your financial account information. Your use of these services is subject to their privacy policies and security practices.</p>

                        <h2>9. Subscription and Payment Terms</h2>

                        <h3>9.1 Subscription Tiers</h3>
                        <p>The Service offers Free, Essential, Pro, and Ultimate subscription tiers with different features and limits as described on the Service.</p>

                        <h3>9.2 Pro Tier Subscription</h3>
                        <p>Pro Tier subscriptions are billed monthly ($20.00/month) or annually ($15.00/month, billed as $180.00/year). Ultimate Tier subscriptions are billed monthly ($60.00/month) or annually ($600.00/year).</p>

                        <h3>9.3 Payment Processing</h3>
                        <p>Payments are processed through Stripe. By subscribing, you agree to Stripe&apos;s terms of service.</p>

                        <h3>9.4 Sales Tax</h3>
                        <p>For Texas-based customers, we collect and remit Texas sales tax on 80% of the subscription fee in accordance with Texas Tax Code §151.351 (data processing services exemption).</p>

                        <h3>9.5 Automatic Renewal</h3>
                        <p>Pro Tier subscriptions automatically renew unless cancelled before the renewal date. You may cancel your subscription at any time through your account settings.</p>

                        <h3>9.6 Refunds</h3>
                        <p>Subscription fees are non-refundable except as required by law or as otherwise specified in these Terms.</p>

                        <h3>9.7 Price Changes</h3>
                        <p>We reserve the right to change subscription prices with 30 days&apos; notice. Price changes will not affect your current subscription period but will apply to renewals.</p>

                        <h2>10. Limitation of Liability</h2>

                        <h3>10.1 Disclaimer of Warranties</h3>
                        <p>THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>

                        <h3>10.2 No Guarantees</h3>
                        <p>We do not guarantee that:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>The Service will be uninterrupted, secure, or error-free</li>
                            <li>The Service will meet your requirements</li>
                            <li>The accuracy, completeness, or timeliness of information displayed</li>
                            <li>That defects will be corrected</li>
                        </ul>

                        <h3>10.3 Limitation of Liability</h3>
                        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, INTELLIFIDE, LLC, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND AGENTS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR RELATING TO YOUR USE OF THE SERVICE.</p>

                        <h3>10.4 Maximum Liability</h3>
                        <p>Our total liability to you for any claims arising from or related to the Service shall not exceed the amount you paid us in the 12 months preceding the claim, or $100, whichever is greater.</p>

                        <h3>10.5 Exclusions</h3>
                        <p>Some jurisdictions do not allow the exclusion of certain warranties or limitation of liability. In such jurisdictions, our liability is limited to the maximum extent permitted by law.</p>

                        <h2>11. Indemnification</h2>

                        <h3>11.1 Indemnification Obligation</h3>
                        <p>You agree to indemnify, defend, and hold harmless Intellifide, LLC, its officers, directors, employees, and agents from and against all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising from or related to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Your use of the Service</li>
                            <li>Your violation of these Terms</li>
                            <li>Your violation of any law or regulation</li>
                            <li>Your violation of any third-party rights</li>
                            <li>Content you provide to the Service</li>
                        </ul>

                        <h3>11.2 Defense and Settlement</h3>
                        <p>We reserve the right to assume exclusive defense and control of any matter subject to indemnification by you, at your expense. You agree not to settle any matter without our prior written consent.</p>

                        <h2>12. Termination</h2>

                        <h3>12.1 Termination by You</h3>
                        <p>You may terminate your account at any time by contacting us or through your account settings.</p>

                        <h3>12.2 Termination by Us</h3>
                        <p>We may terminate or suspend your account immediately, without prior notice, for:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Violation of these Terms</li>
                            <li>Fraudulent, abusive, or illegal activity</li>
                            <li>Non-payment of subscription fees</li>
                            <li>Any other reason we deem necessary</li>
                        </ul>

                        <h3>12.3 Effect of Termination</h3>
                        <p>Upon termination:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Your right to use the Service immediately ceases</li>
                            <li>We may delete your account and data (subject to our Privacy Policy)</li>
                            <li>You remain liable for all charges incurred prior to termination</li>
                            <li>Sections that by their nature should survive will survive termination</li>
                        </ul>

                        <h2>13. Dispute Resolution - READ CAREFULLY</h2>

                        <h3>13.1 Mandatory Binding Arbitration</h3>
                        <p>Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof, including the determination of the scope or applicability of this agreement to arbitrate, shall be determined by <strong>binding individual arbitration</strong> in Austin, Texas, before one arbitrator. The arbitration shall be administered by JAMS regarding its Comprehensive Arbitration Rules and Procedures. <strong>YOU AND INTELLIFIDE, LLC WAIVE THE RIGHT TO A TRIAL BY JURY.</strong></p>

                        <h3>13.2 Class Action Waiver</h3>
                        <p><strong>YOU AND INTELLIFIDE, LLC AGREE THAT EACH MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE PROCEEDING.</strong> Unless both you and Intellifide, LLC agree otherwise, the arbitrator may not consolidate more than one person&apos;s claims with your claims and may not otherwise preside over any form of a representative or class proceeding.</p>

                        <h3>13.3 Governing Law and Venue</h3>
                        <p>These Terms shall be governed by the laws of the State of Texas without regard to conflict of law principles. For any dispute not subject to arbitration, you and Intellifide, LLC agree to submit to the personal and exclusive jurisdiction of the state and federal courts located in Travis County, Texas.</p>

                        <h2>14. General Provisions</h2>

                        <h3>14.1 Entire Agreement</h3>
                        <p>These Terms, together with our Privacy Policy, constitute the entire agreement between you and Intellifide, LLC regarding the Service.</p>

                        <h3>14.2 Severability</h3>
                        <p>If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.</p>

                        <h3>14.3 Waiver</h3>
                        <p>Our failure to enforce any provision of these Terms does not constitute a waiver of that provision or any other provision.</p>

                        <h3>14.4 Assignment</h3>
                        <p>You may not assign or transfer these Terms or your account without our prior written consent. We may assign these Terms without restriction.</p>

                        <h3>14.5 Notices</h3>
                        <p>Notices to you may be sent via email or through the Service. Notices to us should be sent to the contact information provided on the Service.</p>

                        <h3>14.6 Force Majeure</h3>
                        <p>We are not liable for any failure to perform our obligations due to circumstances beyond our reasonable control.</p>

                        <h2>15. Contact Information</h2>

                        <h3>15.1 Company Information</h3>
                        <p>
                            Intellifide, LLC<br />
                            1234 Innovation Drive<br />
                            Suite 500<br />
                            Austin, TX 78701<br />
                            United States<br />
                            Phone: +1 (555) 123-4567<br />
                            Email: support@jualuma.com
                        </p>

                        <h3>15.2 Legal Notices</h3>
                        <p>For legal notices or service of process:</p>
                        <p>
                            Intellifide, LLC<br />
                            Registered Agent: Legal Services of Texas, LLC<br />
                            1234 Innovation Drive, Suite 500<br />
                            Austin, TX 78701<br />
                            United States
                        </p>

                        <h3>15.3 Support</h3>
                        <p>For support inquiries:</p>
                        <p>
                            Email: <Link to="mailto:support@jualuma.com" className="text-primary hover:underline">support@jualuma.com</Link><br />
                            Website: <Link to="/support" className="text-primary hover:underline">jualuma.com/support</Link>
                        </p>
                    </div>
                </div>
            </section>
        </div>
    );
};
