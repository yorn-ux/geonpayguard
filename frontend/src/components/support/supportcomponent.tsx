'use client';

import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Send, 
  FileQuestion, 
  ShieldCheck, 
  ExternalLink,
  ChevronRight,
  Clock as ClockIcon,
  HelpCircle,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Ticket,
  History,
  Mail
} from 'lucide-react';

// --- CONFIGURATION ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED';
  createdAt: string;
  message?: string;
}

interface SystemStatus {
  nodes: number;
  latency: number;
  uptime: number;
}

const FAQS: FAQItem[] = [
  {
    category: "Arbitration",
    question: "How long does a typical dispute take?",
    answer: "Most disputes are resolved within 2.4 to 5 business days, depending on the speed of evidence submission from both parties."
  },
  {
    category: "Funds",
    question: "Why are my funds frozen during a dispute?",
    answer: "To ensure a fair outcome, the Arbitration Layer locks the vault amount in a neutral smart-contract until a verdict is rendered."
  },
  {
    category: "Security",
    question: "Who are the arbitrators?",
    answer: "Our arbitrators are neutral third-party legal professionals and system admins with verified credentials in contract law."
  }
];

export default function SupportComponent() {
  const [category, setCategory] = useState('Technical');
  const [ticketSubject, setTicketSubject] = useState('');
  const [message, setMessage] = useState('');
  const [caseReference, setCaseReference] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTicketId, setSubmittedTicketId] = useState('');
  
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [recentTickets, setRecentTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const getAuthToken = () => {
    if (typeof document === 'undefined') return null;
    
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
    };
    
    return getCookie('geon_token') || localStorage.getItem('auth_token');
  };

  const getUserInfo = () => {
    if (typeof document === 'undefined') return null;
    const storedUser = localStorage.getItem('geon_user');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setSystemStatus({
          nodes: 3,
          latency: 24,
          uptime: 99.9
        });
      } catch (err) {
        console.error("Failed to fetch system status:", err);
      } finally {
        setLoadingStatus(false);
      }
    };

    fetchSystemStatus();
  }, []);

  useEffect(() => {
    const fetchRecentTickets = async () => {
      const user = getUserInfo();
      if (!user?.operator_id) return;

      setLoadingTickets(true);
      const token = getAuthToken();

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/dispute/support?operator_id=${user.operator_id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const data = await response.json();
          setRecentTickets(Array.isArray(data) ? data.slice(0, 3) : []);
        }
      } catch (err) {
        console.error("Failed to fetch recent tickets:", err);
      } finally {
        setLoadingTickets(false);
      }
    };

    fetchRecentTickets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const token = getAuthToken();
    const user = getUserInfo();

    if (!token || !user?.operator_id) {
      alert("Authentication required. Please log in again.");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/dispute/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          subject: ticketSubject,
          message,
          case_reference: caseReference || undefined,
          operator_id: user.operator_id,
          role: user.role || 'influencer'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create ticket");
      }

      const data = await response.json();
      setSubmittedTicketId(data.id);
      setSubmitted(true);
      
      setTicketSubject('');
      setMessage('');
      setCaseReference('');
      
    } catch (err: any) {
      alert(err.message || "Node transmission failed. Please check network integrity.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="text-emerald-600" size={28} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Ticket Submitted</h3>
        <p className="text-sm text-gray-500 mb-2">Reference: {submittedTicketId || 'SR-' + Math.floor(Math.random() * 10000)}</p>
        <p className="text-xs text-gray-400 mb-6">Your support request has been received.</p>
        <button 
          onClick={() => setSubmitted(false)}
          className="px-6 py-2.5 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-colors"
        >
          Create Another Ticket
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center text-white shadow-sm">
            <LifeBuoy size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Support Center</h1>
            <p className="text-sm text-gray-500">Get help with disputes, technical issues, and more</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content - Ticket Form & FAQs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Ticket Form */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Ticket size={18} className="text-rose-500" />
              <h2 className="text-sm font-medium text-gray-700">Submit Support Ticket</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                    required
                  >
                    <option>Technical</option>
                    <option>Escalation Request</option>
                    <option>Evidence Submission</option>
                    <option>Billing & Payouts</option>
                    <option>Dispute Support</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Case Reference (Optional)</label>
                  <input 
                    type="text" 
                    value={caseReference}
                    onChange={(e) => setCaseReference(e.target.value)}
                    placeholder="e.g. DSP-1234"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Subject</label>
                <input 
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  type="text" 
                  placeholder="Brief summary of your issue"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 mb-1 block">Description</label>
                <textarea 
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Provide detailed information about your issue..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none"
                  required
                  maxLength={1000}
                />
                <p className="text-xs text-gray-400 text-right mt-1">
                  {message.length}/1000
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting || !ticketSubject.trim() || !message.trim()}
                className="w-full px-4 py-3 bg-rose-500 text-white rounded-lg text-sm font-medium hover:bg-rose-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <HelpCircle size={18} className="text-rose-500" />
              <h2 className="text-sm font-medium text-gray-700">Frequently Asked Questions</h2>
            </div>
            
            <div className="space-y-3">
              {FAQS.map((faq, i) => (
                <details key={i} className="group bg-gray-50 rounded-lg transition-all cursor-pointer">
                  <summary className="flex justify-between items-center p-4 list-none">
                    <div>
                      <span className="text-xs px-2 py-0.5 bg-rose-100 text-rose-600 rounded inline-block mb-2">
                        {faq.category}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{faq.question}</p>
                    </div>
                    <ChevronRight size={18} className="text-gray-400 group-open:rotate-90 transition-transform" />
                  </summary>
                  <div className="px-4 pb-4 text-sm text-gray-600 border-t border-gray-200 pt-3">
                    {faq.answer}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          
          {/* System Status */}
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="text-emerald-600" size={16} />
              <h3 className="text-xs font-medium text-emerald-700">System Status</h3>
            </div>
            {loadingStatus ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-emerald-600" />
                <p className="text-xs text-emerald-600">Checking...</p>
              </div>
            ) : (
              <>
                <p className="text-lg font-semibold text-emerald-900 mb-1">
                  {systemStatus?.nodes || 3} Nodes Online
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-xs text-emerald-600">
                    {systemStatus?.latency || 24}ms • {systemStatus?.uptime || 99.9}% uptime
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Recent Tickets */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-xs font-medium text-gray-700 mb-3 flex items-center gap-2">
              <History size={14} className="text-gray-400" /> Recent Activity
            </h3>
            
            {loadingTickets ? (
              <div className="flex justify-center py-4">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : recentTickets.length > 0 ? (
              <div className="space-y-3">
                {recentTickets.map((ticket) => (
                  <div key={ticket.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-400">#{ticket.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        ticket.status === 'RESOLVED' ? 'bg-emerald-100 text-emerald-600' :
                        ticket.status === 'ACTIVE' ? 'bg-amber-100 text-amber-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 mb-1">{ticket.subject}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(ticket.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Mail className="mx-auto text-gray-200 mb-2" size={24} />
                <p className="text-sm text-gray-400">No recent tickets</p>
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <h3 className="text-xs font-medium text-gray-700 mb-3">Quick Resources</h3>
            <div className="space-y-2">
              <a href="/docs" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <FileQuestion size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600 flex-1">Documentation</span>
                <ExternalLink size={14} className="text-gray-300" />
              </a>
              <a href="/queue" className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                <ClockIcon size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600 flex-1">Queue Times</span>
                <ExternalLink size={14} className="text-gray-300" />
              </a>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-rose-50 rounded-xl border border-rose-100 p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-rose-800 mb-1">Emergency Escalation</p>
                <p className="text-xs text-rose-600">
                  For urgent matters, please use the hotline above or expect a 2-4 hour response time.
                </p>
                <p className="text-xs font-medium text-rose-700 mt-2">legal@arbitrate.node</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}