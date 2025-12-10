import React from 'react';


export const Privacy = () => {
    return (
        <div>
            <section className="container max-w-[800px] py-12">
                <div className="glass-panel">
                    <h1 className="mb-4">Privacy Policy</h1>
                    <p className="text-text-secondary mb-8 text-sm">
                        <strong>Last Updated:</strong> January 15, 2025<br />
                        <strong>Effective Date:</strong> January 15, 2025
                    </p>

                    <div className="max-w-[800px] mx-auto space-y-6">
                        <h2>Introduction</h2>
                        <p>Intellifide, LLC (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you access or use the Finity platform (the &quot;Service&quot;). We are committed to protecting your privacy and handling your personal information responsibly.</p>
                        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 my-4">
                            <strong>Important:</strong> As a financial data aggregator, we are classified as a &quot;financial institution&quot; under the Gramm-Leach-Bliley Act (GLBA). This Privacy Policy describes how we collect, use, share, and protect your information in compliance with GLBA and other applicable privacy laws.
                        </div>

                        <h2>1. Information We Collect</h2>

                        <h3>1.1 Information You Provide</h3>
                        <p><strong>Account Information:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Name</li>
                            <li>Email address</li>
                            <li>Password (encrypted)</li>
                            <li>Phone number (if provided)</li>
                            <li>Subscription preferences</li>
                        </ul>
                        <p><strong>Financial Account Information:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Account numbers (masked/encrypted)</li>
                            <li>Account balances</li>
                            <li>Transaction history</li>
                            <li>Account types and institutions</li>
                            <li>Web3 wallet addresses</li>
                        </ul>
                        <p><strong>Usage Information:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Preferences and settings</li>
                            <li>Notification preferences</li>
                            <li>Theme preferences</li>
                            <li>Feature usage data</li>
                        </ul>

                        <h3>1.2 Information We Collect Automatically</h3>
                        <p><strong>Technical Information:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>IP address</li>
                            <li>Device information</li>
                            <li>Browser type and version</li>
                            <li>Operating system</li>
                            <li>Usage patterns and analytics</li>
                            <li>Cookies and similar technologies</li>
                        </ul>
                        <p><strong>Service Usage:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Features used</li>
                            <li>Time spent on Service</li>
                            <li>Pages viewed</li>
                            <li>Actions taken</li>
                        </ul>

                        <h3>1.3 Information from Third Parties</h3>
                        <p><strong>Financial Institutions:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Account information from banks, credit cards, cryptocurrency exchanges</li>
                            <li>Transaction data</li>
                            <li>Account balances</li>
                            <li>Through read-only API connections (e.g., Plaid, CEX APIs)</li>
                        </ul>
                        <p><strong>Authentication Services:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Information from authentication providers (e.g., Google, Firebase)</li>
                        </ul>

                        <h2>2. How We Use Your Information</h2>

                        <h3>2.1 Service Provision</h3>
                        <p>We use your information to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Provide and maintain the Service</li>
                            <li>Process your transactions and requests</li>
                            <li>Aggregate and analyze your financial data</li>
                            <li>Generate financial reports and insights</li>
                            <li>Categorize transactions automatically</li>
                            <li>Provide AI-powered analysis tools</li>
                            <li>Send you notifications and updates</li>
                            <li>Respond to your inquiries and support requests</li>
                        </ul>

                        <h3>2.2 Service Improvement</h3>
                        <p>We use your information to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Improve and optimize the Service</li>
                            <li>Develop new features</li>
                            <li>Analyze usage patterns</li>
                            <li>Conduct research and analytics</li>
                            <li>Ensure Service security and prevent fraud</li>
                        </ul>

                        <h3>2.3 Communication</h3>
                        <p>We use your information to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Send you service-related communications</li>
                            <li>Send you notifications (if enabled)</li>
                            <li>Send you marketing communications (with your consent, where required)</li>
                            <li>Respond to your inquiries</li>
                        </ul>

                        <h3>2.4 Legal and Compliance</h3>
                        <p>We use your information to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Comply with legal obligations</li>
                            <li>Respond to legal process</li>
                            <li>Protect our rights and property</li>
                            <li>Enforce our Terms of Service</li>
                            <li>Comply with GLBA and other regulations</li>
                        </ul>

                        <h2>3. Information Sharing and Disclosure</h2>

                        <p>By accessing or using the Service, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy and our Terms of Service.</p>

                        <h3>3.2 Service Providers</h3>
                        <p>We share information with service providers who help us operate the Service:</p>
                        <p><strong>Data Aggregation:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Plaid (financial account aggregation)</li>
                            <li>Cryptocurrency exchange APIs (CEX data)</li>
                            <li>Web3 wallet services</li>
                        </ul>
                        <p><strong>Cloud Infrastructure:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Google Cloud Platform (data storage and processing)</li>
                        </ul>
                        <p><strong>Payment Processing:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Stripe (subscription payments)</li>
                        </ul>
                        <p><strong>Communication:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>SendGrid (email services)</li>
                            <li>Twilio (SMS services)</li>
                        </ul>
                        <p><strong>Analytics:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Google Analytics (usage analytics - anonymized)</li>
                        </ul>
                        <p>All service providers are contractually required to protect your information and use it only for the purposes we specify.</p>

                        <h3>3.3 Legal Requirements</h3>
                        <p>We may disclose your information if required by law, court order, or government regulation, including:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Response to subpoenas or legal process</li>
                            <li>Compliance with GLBA and other financial regulations</li>
                            <li>Protection of our rights and property</li>
                            <li>Prevention of fraud or illegal activity</li>
                        </ul>

                        <h3>3.4 Business Transfers</h3>
                        <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity, subject to the same privacy protections.</p>
                        <p>Residents of Canada have the right to access and correct their personal information. We transfer data to the United States for processing, where it may be subject to access by U.S. authorities.</p>

                        <h3>3.5 With Your Consent</h3>
                        <p>We may share your information with your explicit consent or at your direction.</p>

                        <h2>4. Data Security</h2>

                        <h3>4.1 Security Measures</h3>
                        <p>We implement industry-standard security measures to protect your information:</p>
                        <p><strong>Encryption:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Data encrypted at rest using AES-256</li>
                            <li>Data encrypted in transit using TLS 1.3</li>
                            <li>Encryption keys managed through Google Cloud KMS</li>
                        </ul>
                        <p><strong>Access Controls:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Multi-factor authentication required</li>
                            <li>Role-based access controls</li>
                            <li>Regular access reviews</li>
                            <li>Principle of least privilege</li>
                        </ul>
                        <p><strong>Monitoring:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Continuous security monitoring</li>
                            <li>Intrusion detection</li>
                            <li>Logging and audit trails</li>
                            <li>Regular security assessments</li>
                        </ul>
                        <p><strong>Compliance:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>GLBA Safeguards Rule compliance</li>
                            <li>Written Information Security Program (WISP)</li>
                            <li>Incident Response Plan (IRP)</li>
                            <li>Regular risk assessments</li>
                        </ul>

                        <h3>4.2 No Guarantee of Security</h3>
                        <p>While we implement strong security measures, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security of your information.</p>

                        <h3>4.3 Your Role in Security</h3>
                        <p>You play an important role in protecting your information:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Use strong, unique passwords</li>
                            <li>Enable multi-factor authentication</li>
                            <li>Do not share your account credentials</li>
                            <li>Log out when using shared devices</li>
                            <li>Notify us immediately of any unauthorized access</li>
                        </ul>

                        <h2>5. Your Privacy Rights</h2>

                        <h3>5.1 GLBA Privacy Rights</h3>
                        <p>As a financial institution under GLBA, we provide you with:</p>
                        <p><strong>Privacy Notices:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Initial privacy notice when you create an account</li>
                            <li>Annual privacy notices</li>
                            <li>Updated notices when privacy practices change</li>
                        </ul>
                        <p><strong>Opt-Out Rights:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Right to opt-out of certain information sharing (as applicable)</li>
                            <li>Instructions for exercising opt-out rights</li>
                        </ul>

                        <h3>5.2 CCPA Rights (California Residents)</h3>
                        <p>If you are a California resident, you have the following rights:</p>
                        <p><strong>Right to Know:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Request information about personal information we collect, use, and share</li>
                            <li>Request specific pieces of personal information</li>
                        </ul>
                        <p><strong>Right to Delete:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Request deletion of your personal information (subject to legal exceptions)</li>
                        </ul>
                        <p><strong>Right to Opt-Out:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Opt-out of sale of personal information (we do not sell your information)</li>
                            <li>Opt-out of sharing for cross-context behavioral advertising</li>
                        </ul>
                        <p><strong>Right to Non-Discrimination:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>We will not discriminate against you for exercising your privacy rights</li>
                        </ul>
                        <p><strong>How to Exercise CCPA Rights:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Submit requests through your account settings</li>
                            <li>Email us at <a href="mailto:privacy@finity.com" className="text-primary hover:underline">privacy@finity.com</a></li>
                            <li>We will respond within 45 days (may extend to 90 days with notice)</li>
                        </ul>

                        <h3>5.3 Other State Privacy Rights</h3>
                        <p>We comply with applicable state privacy laws, including:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Texas Data Privacy and Security Act (TDPSA)</li>
                            <li>Other state-specific privacy laws</li>
                        </ul>

                        <h3>5.4 Right to Access and Correction</h3>
                        <p>You may:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Access your personal information through your account</li>
                            <li>Update your account information</li>
                            <li>Request corrections to inaccurate information</li>
                            <li>Export your data (see Section 6)</li>
                        </ul>

                        <h2>6. Data Retention and Deletion</h2>

                        <h3>6.1 Data Retention</h3>
                        <p>We retain your information for as long as necessary to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Provide the Service</li>
                            <li>Comply with legal obligations</li>
                            <li>Resolve disputes</li>
                            <li>Enforce our agreements</li>
                        </ul>
                        <p><strong>Retention Periods:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Account information: While your account is active</li>
                            <li>Financial transaction data: As required for Service functionality</li>
                            <li>Logs and audit trails: As required by law (minimum 1-7 years)</li>
                            <li>Marketing data: Until you opt-out or request deletion</li>
                        </ul>

                        <h3>6.2 Right to be Forgotten</h3>
                        <p>You may request deletion of your personal information:</p>
                        <p><strong>Account Deletion:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>You may delete your account through account settings</li>
                            <li>We will delete your account and personal information</li>
                            <li>Some information may be retained as required by law</li>
                        </ul>
                        <p><strong>Cryptographic Erasure:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>User Data Encryption Keys (DEKs) are destroyed upon account deletion</li>
                            <li>Encrypted data becomes unreadable</li>
                            <li>Physical data deletion occurs within 24 hours of key destruction</li>
                        </ul>
                        <p><strong>Exceptions:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Information required for legal compliance</li>
                            <li>Information required for dispute resolution</li>
                            <li>Information in anonymized or aggregated form</li>
                        </ul>

                        <h2>7. Children&apos;s Privacy</h2>
                        <p>The Service is not intended for children under 18 years of age. We do not knowingly collect personal information from children under 18. If we become aware that we have collected information from a child under 18, we will delete that information immediately.</p>

                        <h2>8. International Data Transfers</h2>
                        <p><strong>International User Access:</strong> The Finity platform is accessible to users worldwide and includes currency conversion features to support international users. However, the Service is primarily optimized for the United States market, and full international compliance frameworks (including GDPR, country-specific privacy regulations, and data transfer agreements) are currently in development for a future release.</p>
                        <p><strong>Data Processing Location:</strong> Your information may be processed and stored in the United States. By using the Service, you consent to the transfer of your information to the United States, which may have different data protection laws than your country of residence.</p>
                        <p><strong>International User Disclaimer:</strong> If you are located outside the United States, please be aware that:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>The Service is optimized for US market compliance (GLBA, CCPA)</li>
                            <li>Full GDPR and country-specific compliance frameworks are planned for a future release</li>
                            <li>You use the Service at your own risk regarding compliance with your local data protection laws</li>
                            <li>We will work to implement full international compliance in future platform updates</li>
                        </ul>
                        <p><strong>Currency Conversion:</strong> The platform supports automatic currency conversion for display purposes. All financial calculations are performed using USD as the base currency, with conversion rates provided by third-party services. Currency conversion is for display convenience only and should not be used for financial decision-making without consulting a qualified financial professional.</p>

                        <h2>9. Cookies and Tracking Technologies</h2>

                        <h3>9.1 Cookies</h3>
                        <p>We use cookies and similar technologies to:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Remember your preferences</li>
                            <li>Analyze Service usage</li>
                            <li>Improve Service functionality</li>
                            <li>Provide personalized experiences</li>
                        </ul>

                        <h3>9.2 Cookie Types</h3>
                        <p><strong>Essential Cookies:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Required for Service functionality</li>
                            <li>Cannot be disabled</li>
                        </ul>
                        <p><strong>Analytics Cookies:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Help us understand Service usage</li>
                            <li>Can be disabled through browser settings</li>
                        </ul>
                        <p><strong>Marketing Cookies:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Used for marketing purposes (with consent)</li>
                            <li>Can be disabled through browser settings</li>
                        </ul>

                        <h3>9.3 Cookie Management</h3>
                        <p>You can manage cookies through your browser settings. Note that disabling certain cookies may affect Service functionality.</p>

                        <h2>10. Third-Party Links and Services</h2>
                        <p>The Service may contain links to third-party websites or services. We are not responsible for the privacy practices of third parties. We encourage you to review the privacy policies of third-party services you use.</p>
                        <p><strong>Key Third-Party Services:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Plaid (financial account aggregation) - See Plaid Privacy Policy</li>
                            <li>Stripe (payment processing) - See Stripe Privacy Policy</li>
                            <li>Google Cloud Platform (infrastructure) - See Google Privacy Policy</li>
                        </ul>

                        <h2>11. Data Types and Classifications</h2>

                        <h3>11.1 Nonpublic Personal Information (NPPI) - GLBA</h3>
                        <p><strong>Examples:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Financial account numbers</li>
                            <li>Account balances</li>
                            <li>Transaction history</li>
                            <li>CEX API keys</li>
                            <li>Authentication credentials</li>
                        </ul>
                        <p><strong>Protections:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Strongest security controls</li>
                            <li>GLBA Privacy Rule (Reg P) disclosures</li>
                            <li>GLBA Safeguards Rule protections</li>
                            <li>Limited sharing (as described in this policy)</li>
                        </ul>

                        <h3>11.2 Personal Information (PI) - CCPA Baseline</h3>
                        <p><strong>Examples:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Name, email address, phone number</li>
                            <li>IP address</li>
                            <li>Website tracking cookies</li>
                            <li>Marketing preferences</li>
                        </ul>
                        <p><strong>Protections:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Standard security controls</li>
                            <li>CCPA compliance</li>
                            <li>Right to access, delete, opt-out</li>
                        </ul>

                        <h3>11.3 Sensitive Personal Information (SPI)</h3>
                        <p><strong>Examples:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Precise geolocation</li>
                            <li>Account credentials</li>
                            <li>Financial account information</li>
                        </ul>
                        <p><strong>Protections:</strong></p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Stricter &quot;opt-in&quot; or &quot;limit use&quot; requirements</li>
                            <li>Higher standard of care</li>
                            <li>Additional security measures</li>
                        </ul>

                        <h2>12. Changes to This Privacy Policy</h2>
                        <p>We may update this Privacy Policy from time to time. The updated version will be indicated by an updated &quot;Last Updated&quot; date and the updated version will be effective as soon as it is accessible.</p>
                        <p>We will notify you of material changes by:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Posting the updated policy on the Service</li>
                            <li>Sending you an email notification</li>
                            <li>Providing notice through the Service</li>
                        </ul>
                        <p><strong>Continued Use:</strong> Your continued use of the Service after changes to this Privacy Policy constitutes your acceptance of the updated policy.</p>

                        <h2>13. Contact Us</h2>

                        <h3>13.1 Privacy Inquiries</h3>
                        <p>If you have questions about this Privacy Policy or our privacy practices, please contact us:</p>
                        <p>
                            <strong>Intellifide, LLC</strong><br />
                            1234 Innovation Drive<br />
                            Suite 500<br />
                            Austin, TX 78701<br />
                            United States<br />
                            Phone: +1 (555) 123-4567<br />
                            Email: <a href="mailto:privacy@finity.com" className="text-primary hover:underline">privacy@finity.com</a>
                        </p>

                        <h3>13.2 Privacy Requests</h3>
                        <p>To exercise your privacy rights (access, deletion, opt-out), please:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Submit requests through your account settings</li>
                            <li>Email us at <a href="mailto:privacy@finity.com" className="text-primary hover:underline">privacy@finity.com</a></li>
                            <li>Include sufficient information to verify your identity</li>
                        </ul>

                        <h3>13.3 Response Time</h3>
                        <p>We will respond to privacy requests within:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li><strong>GLBA requests:</strong> As required by GLBA (typically 30 days)</li>
                            <li><strong>CCPA requests:</strong> Within 45 days (may extend to 90 days with notice)</li>
                            <li><strong>Other requests:</strong> Within reasonable time</li>
                        </ul>

                        <h2>14. Additional Information</h2>

                        <h3>14.1 GLBA Annual Privacy Notice</h3>
                        <p>We provide annual privacy notices as required by GLBA. You will receive:</p>
                        <ul className="list-disc pl-6 space-y-1">
                            <li>Initial notice when you create an account</li>
                            <li>Annual notices each year</li>
                            <li>Updated notices when privacy practices change materially</li>
                        </ul>

                        <h3>14.2 Do Not Track Signals</h3>
                        <p>Some browsers have &quot;Do Not Track&quot; features. We do not currently respond to Do Not Track signals, but we respect your privacy choices through cookie settings and account preferences.</p>

                        <h3>14.3 Data Processing Agreement</h3>
                        <p>If you are a business customer or use our services in a business capacity, we may enter into a separate Data Processing Agreement (DPA) that governs data processing.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};
