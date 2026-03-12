import Link from 'next/link';
import { ArrowLeft, FileText, CheckCircle, AlertCircle,  Shield, Mail, MapPin } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm mb-4">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="text-gray-500 mt-2">Last updated: March 1, 2024</p>
          <div className="mt-2 inline-flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full">
            <MapPin size={14} className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">Kenya jurisdiction</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          
          {/* Introduction */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="text-blue-600" size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Welcome to Aethel PayGuard</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              By signing up or using our services, you agree to these terms. Please read them carefully. 
              If you don't agree with any part, you shouldn't use our platform.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              These terms are governed by the laws of the Republic of Kenya.
            </p>
          </div>

          {/* Quick Summary - Important */}
          <div className="bg-amber-50 rounded-2xl p-6 mb-10 border border-amber-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quick Summary (Not Legal Advice)</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>You must be at least 18 years old to use our services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>We hold funds securely until both parties confirm work is complete</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>If there's a dispute, our resolution team will help mediate</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>We charge fees for our service (clearly shown before you confirm any transaction)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-600 mt-1">•</span>
                    <span>All transactions are in Kenyan Shillings (KES) unless otherwise agreed</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Kenya-Specific Notice */}
          <div className="bg-blue-50 rounded-2xl p-6 mb-10 border border-blue-100">
            <div className="flex items-start gap-3">
              <Shield className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">🇰🇪 Kenya Operations</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Aethel PayGuard operates in compliance with Kenyan law. Here's what you need to know:
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span><span className="font-medium">KRA Compliance:</span> We report transactions as required by the Kenya Revenue Authority</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span><span className="font-medium">MPesa Integration:</span> Payments can be made via MPesa for your convenience</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span><span className="font-medium">Withdrawals:</span> Funds can be withdrawn to your Kenyan bank account or MPesa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span><span className="font-medium">Customer Support:</span> Available in English and Swahili</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Terms Sections */}
          <div className="space-y-8">
            
            <TermSection 
              number="1"
              title="Who can use our services"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>You can use Aethel PayGuard if:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You are at least 18 years old (as required by Kenyan law)</li>
                    <li>You have the legal right to enter into agreements</li>
                    <li>You provide accurate and complete information</li>
                    <li>You have a valid Kenyan ID (National ID, Passport, or Alien Card)</li>
                    <li>You have a Kenyan mobile money account (MPesa) or bank account for withdrawals</li>
                    <li>You haven't been previously banned from our platform</li>
                  </ul>
                </div>
              }
            />

            <TermSection 
              number="2"
              title="How escrow payments work"
              content={
                <div className="space-y-4 text-gray-600">
                  <p>When you use our escrow service:</p>
                  
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2">For Creators/Influencers:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>The brand deposits funds before you start work</li>
                      <li>Money is held securely in our Kenya-based partner accounts</li>
                      <li>You get paid when both sides confirm the work is complete</li>
                      <li>Funds can be withdrawn to your MPesa or bank account</li>
                      <li>If there's a dispute, we help mediate a resolution</li>
                    </ul>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl">
                    <h4 className="font-medium text-gray-900 mb-2">For Businesses/Brands:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-sm">
                      <li>You deposit funds via MPesa, bank transfer, or card</li>
                      <li>Money is only released when you confirm you're satisfied</li>
                      <li>You're protected if the work isn't delivered as promised</li>
                      <li>Funds are returned if the creator can't complete the work</li>
                    </ul>
                  </div>
                </div>
              }
            />

            <TermSection 
              number="3"
              title="Fees and pricing"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>Our fees are simple and transparent (in Kenyan Shillings):</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><span className="font-medium">2.5% transaction fee</span> - deducted from the total payment amount</li>
                    <li><span className="font-medium">MPesa withdrawal fee:</span> Standard Safaricom rates apply (KES 10-50 depending on amount)</li>
                    <li><span className="font-medium">Bank transfer fee:</span> charged for withdrawals to Kenyan banks</li>
                    <li><span className="font-medium">No hidden fees</span> - what you see is what you pay</li>
                    <li><span className="font-medium">Free to sign up</span> - no monthly subscription</li>
                  </ul>
                  <p className="text-sm mt-2">All fees are clearly shown before you confirm any transaction.</p>
                </div>
              }
            />

            <TermSection 
              number="4"
              title="Tax compliance"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>We help you stay compliant with Kenyan tax laws:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Transaction records are maintained for KRA compliance</li>
                    <li>You are responsible for declaring your income to KRA</li>
                    <li>For businesses, we can provide transaction reports for VAT purposes</li>
                    <li>Withholding tax may apply for certain transactions (consult your tax advisor)</li>
                  </ul>
                  <p className="text-sm mt-2 text-amber-600">
                    <span className="font-medium">Note:</span> We're not tax advisors. Please consult a tax professional for advice.
                  </p>
                </div>
              }
            />

            <TermSection 
              number="5"
              title="Dispute resolution"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>If something goes wrong:</p>
                  <ol className="list-decimal pl-5 space-y-2">
                    <li><span className="font-medium">First, talk to each other</span> - Most issues are simple misunderstandings</li>
                    <li><span className="font-medium">Escalate to our team</span> - If you can't agree, we'll help mediate</li>
                    <li><span className="font-medium">Provide evidence</span> - Share screenshots, contracts, or WhatsApp messages</li>
                    <li><span className="font-medium">We make a decision</span> - Based on the evidence, we decide where funds go</li>
                  </ol>
                  <p className="text-sm mt-2">Our decision is final and binding. We aim to resolve all disputes within 5 business days.</p>
                  <p className="text-sm text-gray-500">For unresolved disputes, you may seek mediation through the <span className="font-medium">Nairobi Centre for International Arbitration</span>.</p>
                </div>
              }
            />

            <TermSection 
              number="6"
              title="Prohibited activities"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>You cannot use our platform for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Illegal goods or services (under Kenyan law)</li>
                    <li>Money laundering or fraud</li>
                    <li>Gambling or betting (including sports betting)</li>
                    <li>Adult content or services</li>
                    <li>Weapons, drugs, or counterfeit goods</li>
                    <li>Ponzi schemes or unauthorized investments</li>
                  </ul>
                  <p className="text-sm mt-2">If we suspect illegal activity, we'll freeze your funds and dealt with according to kenya laws and authorities.</p>
                </div>
              }
            />

            <TermSection 
              number="7"
              title="Account suspension and termination"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>We may suspend or close your account if:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You break these terms</li>
                    <li>You use the platform for illegal activities</li>
                    <li>You provide false identification documents</li>
                    <li>You have multiple disputes against you</li>
                    <li>We're required to by Kenyan law or regulatory authorities</li>
                  </ul>
                  <p className="text-sm mt-2">If your account is suspended, any held funds will be returned to the original sender after 90 days, minus any fees and applicable taxes.</p>
                </div>
              }
            />

            <TermSection 
              number="8"
              title="Liability and limitations"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>What we're responsible for:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>We're responsible for holding funds securely with our Kenyan partner institutions</li>
                    <li>We're responsible for following our dispute process fairly</li>
                    <li>We're not responsible for the quality of work delivered</li>
                    <li>We're not responsible if you get scammed outside our platform</li>
                    <li>We're not liable for MPesa or bank transfer delays</li>
                  </ul>
                  <p className="text-sm mt-2">Our total liability is limited to the amount held in escrow for that specific transaction.</p>
                </div>
              }
            />
          </div>

          {/* Acceptance */}
          <div className="mt-10 p-6 bg-green-50 rounded-2xl border border-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle className="text-green-600 shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">By using our platform, you agree to these terms</h3>
                <p className="text-sm text-gray-600">
                  If you have questions about these terms, please contact us. We're here to help!
                </p>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Mail size={14} />
                <span>legal@geon.co.ke</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={14} />
                <span>Nairobi, Kenya</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">📞 +254 (0) 700 000 000</span>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Aethel PayGuard is a service provided by Aethel Technologies Ltd, registered in Kenya.
              All transactions are in KES and subject to Kenyan laws and regulations.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper component for term sections
function TermSection({ number, title, content }: { number: string; title: string; content: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 pb-6 last:border-0">
      <div className="flex items-start gap-4">
        <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">
          {number}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
          <div className="text-gray-600 text-sm leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}