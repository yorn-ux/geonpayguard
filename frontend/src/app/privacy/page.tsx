import Link from 'next/link';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, Clock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-6">
        <div className="max-w-4xl mx-auto px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-900 transition-colors text-sm mb-4">
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-500 mt-2">Last updated: March 1, 2024</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 md:p-12">
          
          {/* Introduction */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Shield className="text-blue-600" size={20} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Your Privacy Matters</h2>
            </div>
            <p className="text-gray-600 leading-relaxed">
              At Aethel PayGuard, we take your privacy seriously. This policy explains how we collect, use, and protect your personal information when you use our platform.
            </p>
          </div>

          {/* Quick Summary */}
          <div className="bg-blue-50 rounded-2xl p-6 mb-12">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Summary</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>We only collect information needed to verify your identity and process payments</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>Your funds are held in separate accounts - we never mix them with our operating money</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>We never sell your personal data to third parties</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">•</span>
                <span>You can request a copy of your data or delete your account anytime</span>
              </li>
            </ul>
          </div>

          {/* Sections */}
          <div className="space-y-10">
            
            <Section 
              icon={<Database size={20} />}
              title="What information we collect"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>When you sign up or use our services, we may collect:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Your name, email address, and phone number</li>
                    <li>Business information (if you're registering as a business)</li>
                    <li>Payment information (processed securely through our payment partners)</li>
                    <li>Identity verification documents (to comply with legal requirements)</li>
                    <li>Information about your campaigns and transactions</li>
                  </ul>
                </div>
              }
            />

            <Section 
              icon={<Lock size={20} />}
              title="How we protect your information"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>We use industry-standard security measures to keep your data safe:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>256-bit encryption for all sensitive data</li>
                    <li>Regular security audits and monitoring</li>
                    <li>Strict access controls - only essential personnel can access your data</li>
                    <li>Secure data centers with 24/7 physical security</li>
                  </ul>
                </div>
              }
            />

            <Section 
              icon={<Eye size={20} />}
              title="How we use your information"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>We use your information to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Verify your identity and prevent fraud</li>
                    <li>Process your payments and transactions</li>
                    <li>Communicate with you about your account and campaigns</li>
                    <li>Improve our services and customer support</li>
                    <li>Comply with legal and regulatory requirements</li>
                  </ul>
                </div>
              }
            />

            <Section 
              icon={<Clock size={20} />}
              title="How long we keep your data"
              content={
                <p className="text-gray-600">
                  We keep your information as long as you have an account with us. If you close your account, 
                  we may need to keep certain information for legal and regulatory reasons (usually 5-7 years), 
                  but it will be securely archived and only accessed when required by law.
                </p>
              }
            />

            <Section 
              icon={<Mail size={20} />}
              title="Your rights"
              content={
                <div className="space-y-3 text-gray-600">
                  <p>You have the right to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Access the personal data we hold about you</li>
                    <li>Correct any inaccurate information</li>
                    <li>Request deletion of your data (subject to legal requirements)</li>
                    <li>Opt out of marketing communications</li>
                    <li>Export your data in a portable format</li>
                  </ul>
                </div>
              }
            />
          </div>

          {/* Contact Information */}
          <div className="mt-12 pt-8 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Questions about your privacy?</h3>
            <p className="text-gray-600 mb-4">
              If you have any questions or concerns about this privacy policy, please contact us:
            </p>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> privacy@geon.com<br />
                <span className="font-medium">Response time:</span> Within 48 hours
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Helper component for consistent sections
function Section({ icon, title, content }: { icon: React.ReactNode; title: string; content: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600">
          {icon}
        </div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="pl-11">
        {content}
      </div>
    </div>
  );
}