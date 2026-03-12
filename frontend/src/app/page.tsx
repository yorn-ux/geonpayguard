'use client';

import { 
  ShieldCheck, ArrowRight, Lock, FileCheck, 
  Scale,  ChevronRight,
  Fingerprint, TrendingUp, Briefcase, 
  Zap, Users, CheckCircle, Award, Clock,
  Star,
  Github, Twitter, Linkedin, Mail
} from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

export default function FinalLandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  // Parallax effect on hero
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (heroRef.current) {
        const { clientX, clientY } = e;
        const { width, height } = heroRef.current.getBoundingClientRect();
        const x = (clientX - width / 2) / 25;
        const y = (clientY - height / 2) / 25;
        setMousePosition({ x, y });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const coreInfrastructure = [
    {
      icon: Lock,
      title: 'Tier-1 Asset Protection',
      description: 'Capital is held in segregated, institutional-grade accounts, ensuring total isolation from operational funds.',
      stats: '100% Segregated'
    },
    {
      icon: Fingerprint,
      title: 'Deterministic Settlement',
      description: 'Release is governed by cryptographic proof of delivery and multi-party verification protocols.',
      stats: 'Multi-sig Required'
    },
    {
      icon: Scale,
      title: 'Professional Arbitration',
      description: 'Access to a neutral dispute enclave for high-stakes resolutions and expert mediation support.',
      stats: '48h Resolution'
    },
    {
      icon: TrendingUp,
      title: 'Immutable Audit Trails',
      description: 'Every action is timestamped and logged, providing a transparent ledger for brand compliance.',
      stats: 'Real-time Audit'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Fashion Influencer',
      content: 'GeonPayGuard transformed how I work with luxury brands. No more payment anxiety—just secure, guaranteed transactions.',
      image: '/testimonials/sarah.jpg',
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Marketing Director, LVMH',
      content: 'The institutional-grade security and professional arbitration give us confidence to run multi-million dollar campaigns.',
      image: '/testimonials/michael.jpg',
      rating: 5
    },
    {
      name: 'Emma Williams',
      role: 'Agency Partner',
      content: 'Managing multiple creator payments has never been easier. The vault system is revolutionary for our workflow.',
      image: '/testimonials/emma.jpg',
      rating: 5
    }
  ];

  const stats = [
    { value: '$50M+', label: 'Protected Volume', icon: ShieldCheck },
    { value: '10K+', label: 'Verified Deals', icon: CheckCircle },
    { value: '99.9%', label: 'Success Rate', icon: Award },
    { value: '<24h', label: 'Avg. Settlement', icon: Clock }
  ];

  // Custom Logo Component - Unique "G" with protective ring
  const GeonLogo = () => (
    <div className="relative w-8 h-8 flex items-center justify-center">
      {/* Outer protective ring */}
      <div className="absolute inset-0 border-2 border-[#1A1C21] rounded-lg opacity-20"></div>
      {/* Inner protective ring */}
      <div className="absolute inset-1 border border-[#1A1C21] rounded-md opacity-40"></div>
      {/* The "G" */}
      <span className="relative text-lg font-bold text-[#1A1C21]" style={{ transform: 'rotate(0deg)' }}>G</span>
      {/* Small security dots */}
      <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
      <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-[#1A1C21] selection:bg-slate-100 font-sans overflow-x-hidden">
      {/* Navigation */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-md border-b border-slate-100 py-3' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 group">
            <GeonLogo />
            <span className="text-sm font-bold tracking-tight text-[#1A1C21]">
              GEON<span className="font-medium text-slate-400">PAYGUARD</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-6">
            {['Verified Deals', 'Protocol', 'Security', 'Pricing'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-[#1A1C21] transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#1A1C21] transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center space-x-3">
            <Link 
              href="/auth/login" 
              className="text-[10px] font-bold uppercase tracking-widest text-[#1A1C21] hover:text-slate-600 transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/register" 
              className="px-4 py-2 bg-[#1A1C21] text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl shadow-slate-200 hover:scale-105"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Parallax */}
      <section ref={heroRef} className="relative pt-36 pb-20 overflow-hidden">
        {/* Animated Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" 
             style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }} />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-slate-100 rounded-full blur-3xl opacity-30 animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 shadow-sm animate-fade-in">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-600"></span>
            </span>
            <span>The Gold Standard for Partnership Security</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-[#1A1C21] mb-6 leading-[1.1]">
            Secure Your <br />
            <span className="text-slate-400 relative">
              Partnerships.
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-slate-200 rounded-full" />
            </span>
          </h1>
          
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Eliminate counterparty risk with our institutional-grade escrow engine. 
            Designed for creators, brands, and agencies who refuse to operate on trust alone.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              href="/auth/register" 
              className="group px-8 py-4 bg-[#1A1C21] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center shadow-xl shadow-slate-200 hover:scale-105"
            >
              Create Your First Secure Partnership
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="flex justify-center mb-2">
                  <stat.icon size={20} className="text-slate-400 group-hover:text-[#1A1C21] transition-colors" />
                </div>
                <div className="text-xl font-bold text-[#1A1C21]">{stat.value}</div>
                <div className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-slate-100 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-400 text-center mb-6">Trusted by Industry Leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-8 opacity-50">
            {['VOGUE', 'GQ', 'DIOR', 'CHANEL', 'NIKE', 'ADIDAS'].map((brand) => (
              <span key={brand} className="text-xs font-bold text-slate-400 tracking-widest">{brand}</span>
            ))}
          </div>
        </div>
      </section>

{/* Verified Partnerships Section */}
<section id="verified-deals" className="py-24 bg-white">
  <div className="max-w-7xl mx-auto px-6">
    <div className="grid md:grid-cols-2 gap-16 items-center">
      <div className="animate-slide-in-left">
        <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4 block">Discover Verified Partnerships</span>
        <h2 className="text-4xl font-bold tracking-tight text-[#1A1C21] mb-6">Access Protected <br />High-Value Campaigns.</h2>
        <p className="text-lg text-slate-500 mb-8 leading-relaxed font-medium">
          Join an elite ecosystem where influencers connect directly with premium brands. 
          Every campaign comes with guaranteed payment vaults and professional-grade protection.
        </p>
        
        <div className="space-y-3 mb-8">
          {[
            'Direct access to luxury brand campaigns',
            'Multi-million dollar agency mandates',
            'Real-time campaign tracking and analytics'
          ].map((item, i) => (
            <div key={i} className="flex items-center space-x-3">
              <CheckCircle size={18} className="text-emerald-500 flex-shrink-0" />
              <span className="text-sm text-slate-600">{item}</span>
            </div>
          ))}
        </div>

        <Link 
          href="/auth/register?role=influencer" 
          className="inline-flex items-center text-[#1A1C21] text-[10px] font-bold uppercase tracking-wider hover:gap-2 transition-all"
        >
          Browse Campaigns <ChevronRight size={14} className="ml-1" />
        </Link>
      </div>

      {/* Campaign Cards - Placeholder Content */}
      <div className="grid grid-cols-2 gap-4 animate-slide-in-right">
        {[1, 2, 3, 4].map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all hover:scale-105 cursor-pointer group">
            <div className="text-xs font-bold text-slate-400 mb-2">Brand Partner</div>
            <div className="text-lg font-bold text-[#1A1C21] mb-1">KES ---</div>
            <div className="text-[10px] text-slate-400 mb-3">Campaign Type</div>
            <div className="flex items-center text-[8px] font-bold text-emerald-600">
              <Zap size={10} className="mr-1" /> Verified
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Note about real campaigns */}
    <p className="text-center text-[10px] text-slate-400 mt-8">
      *Actual campaign details available after verification
    </p>
  </div>
</section>
 
      {/* Core Infrastructure with Enhanced Cards */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4 block">Built for Excellence</span>
            <h2 className="text-4xl font-bold tracking-tight text-[#1A1C21] mb-4">Institutional-Grade Infrastructure</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Every feature designed to eliminate friction and build trust between partners.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreInfrastructure.map((item, i) => (
              <div key={i} className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-[#1A1C21] hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[#1A1C21] mb-5 group-hover:bg-[#1A1C21] group-hover:text-white transition-all">
                  <item.icon size={22} />
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.description}</p>
                <div className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider">{item.stats}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400 mb-4 block">Trusted by Creators & Brands</span>
            <h2 className="text-4xl font-bold tracking-tight text-[#1A1C21]">What Our Partners Say</h2>
          </div>

          <div className="relative max-w-3xl mx-auto">
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
              >
                {testimonials.map((testimonial, i) => (
                  <div key={i} className="w-full flex-shrink-0 px-4">
                    <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                      <div className="flex items-center mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} size={16} className="text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-lg text-slate-700 mb-6 italic">"{testimonial.content}"</p>
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-slate-300 rounded-full mr-4" />
                        <div>
                          <p className="font-bold text-sm">{testimonial.name}</p>
                          <p className="text-xs text-slate-400">{testimonial.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center space-x-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === activeTestimonial ? 'bg-[#1A1C21] w-4' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Settlement Protocol with Timeline */}
      <section id="protocol" className="py-24 bg-[#1A1C21] text-white mx-6 rounded-[40px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 mb-4 block">The Settlement Protocol</span>
            <h2 className="text-4xl font-bold tracking-tight">Three Stages of Trust</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2" />
            
            {[
              { n: '01', t: 'Custody', d: 'Agreement is locked. The buyer deposits funds into our secure, neutral vault with real-time verification.', icon: Lock },
              { n: '02', t: 'Verification', d: 'The seller performs the work. Evidence is submitted directly through our secure verification portal.', icon: FileCheck },
              { n: '03', t: 'Disbursement', d: 'Once validated or the timer expires, assets are instantly disbursed to the seller\'s account.', icon: CheckCircle }
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur" />
                <div className="relative bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-white/30 transition-all">
                  <div className="text-4xl font-bold text-white/10 mb-4 group-hover:text-white/30 transition-colors">{step.n}</div>
                  <step.icon size={24} className="text-white/70 mb-4" />
                  <h4 className="text-lg font-bold mb-3">{step.t}</h4>
                  <p className="text-slate-400 leading-relaxed text-xs">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-50 rounded-[40px] p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1500" />
            
            <h2 className="text-4xl font-bold tracking-tight text-[#1A1C21] mb-4">
              Ready to Secure Your Partnerships?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
              Join thousands of creators and brands who trust GeonPayGuard for their most important collaborations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/auth/register?role=influencer" 
                className="group px-8 py-4 bg-white border border-slate-200 text-[#1A1C21] font-bold text-xs uppercase tracking-widest rounded-xl hover:border-[#1A1C21] transition-all flex items-center justify-center"
              >
                Join as Influencer
                <Users size={16} className="ml-2" />
              </Link>
              <Link 
                href="/auth/register?role=business" 
                className="group px-8 py-4 bg-[#1A1C21] text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center"
              >
                Join as Business
                <Briefcase size={16} className="ml-2" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-[#1A1C21] flex items-center justify-center rounded-lg relative">
                  {/* Custom GeonPayGuard Logo */}
                  <div className="absolute inset-0 border-2 border-white/20 rounded-lg"></div>
                  <div className="absolute inset-1 border border-white/10 rounded-md"></div>
                  <span className="relative text-white font-bold text-lg">G</span>
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                </div>
                <span className="text-sm font-bold tracking-tight text-[#1A1C21]">GEONPAYGUARD</span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                Institutional-grade security and professional arbitration for modern partnerships. 
                Trust infrastructure for the creator economy.
              </p>
            </div>
            
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Product</h4>
              <ul className="space-y-2">
                {['Features', 'Security', 'Pricing', 'API'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-slate-500 hover:text-[#1A1C21] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Company</h4>
              <ul className="space-y-2">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-slate-500 hover:text-[#1A1C21] transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-100">
            <div className="flex space-x-4 mb-4 md:mb-0">
              <a href="#" className="text-slate-400 hover:text-[#1A1C21] transition-colors">
                <Twitter size={16} />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#1A1C21] transition-colors">
                <Linkedin size={16} />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#1A1C21] transition-colors">
                <Github size={16} />
              </a>
              <a href="#" className="text-slate-400 hover:text-[#1A1C21] transition-colors">
                <Mail size={16} />
              </a>
            </div>
            
            <div className="flex gap-6 text-[9px] font-bold uppercase tracking-widest text-slate-300">
              <Link href="/terms" className="hover:text-[#1A1C21] transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-[#1A1C21] transition-colors">Privacy</Link>
              <span className="hover:text-[#1A1C21] transition-colors cursor-pointer">Security</span>
              <span className="hover:text-[#1A1C21] transition-colors cursor-pointer">Cookies</span>
            </div>
          </div>
          
          <p className="text-center text-[8px] text-slate-300 mt-8">
            © {new Date().getFullYear()} GEONPAYGUARD. All rights reserved. 
            Independent escrow facilitator. Funds held via regulated payment partners.
          </p>
        </div>
      </footer>

      {/* Add custom animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
        
        .animate-slide-in-left {
          animation: slide-in-left 0.8s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slide-in-right 0.8s ease-out;
        }
        
        .transition-duration-1500 {
          transition-duration: 1500ms;
        }
      `}</style>
    </div>
  );
}