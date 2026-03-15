'use client';

import { 
  ArrowRight, Lock, FileCheck, 
  Scale, ChevronRight, Fingerprint,  
   Users, CheckCircle, Award, Clock,
  Star, Github, Twitter, Linkedin, Mail, 
  Sparkles, Building2,  BadgeCheck, Gem,
  Layers, CircuitBoard, Shield, 
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
    
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

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

  // Professional Logo Component - Redesigned
  const GeonLogo = () => (
    <div className="relative flex items-center">
      {/* Main Logo Mark */}
      <div className="relative w-10 h-10 mr-3">
        {/* Outer Hexagon Shield */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700 rounded-xl rotate-45 transform origin-center shadow-lg" />
        
        {/* Inner Geometric Pattern */}
        <div className="absolute inset-[3px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg rotate-45 transform origin-center" />
        
        {/* Gold Accent Lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-0.5 bg-amber-400/60 rounded-full rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="w-4 h-0.5 bg-amber-400/60 rounded-full -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        
        {/* Central Gem/Crystal */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            <Gem size={16} className="text-amber-400/90" strokeWidth={1.5} />
            <div className="absolute inset-0 blur-sm bg-amber-400/30 rounded-full" />
          </div>
        </div>
        
        {/* Security Dots */}
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white shadow-lg" />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white shadow-lg" />
        
        {/* Rotating Ring Animation */}
        <div className="absolute -inset-1 border border-amber-400/20 rounded-xl rotate-45 animate-spin-slow" />
      </div>

      {/* Text Mark */}
      <div className="flex flex-col">
        <div className="flex items-baseline">
          <span className="text-xl font-black tracking-tight text-slate-900">GEON</span>
          <span className="text-xs font-medium text-slate-400 ml-1 tracking-widest">®</span>
        </div>
        <div className="flex items-center gap-1 -mt-1">
          <Shield size={10} className="text-amber-500" />
          <span className="text-[8px] font-bold uppercase tracking-[0.3em] text-slate-400">PAYGUARD</span>
          <BadgeCheck size={10} className="text-emerald-500 ml-1" />
        </div>
      </div>
    </div>
  );

  // Alternate Minimal Logo for Dark Backgrounds
  const GeonLogoLight = () => (
    <div className="relative flex items-center">
      <div className="relative w-9 h-9 mr-3">
        <div className="absolute inset-0 bg-white/10 backdrop-blur-sm rounded-xl rotate-45 border border-white/20" />
        <div className="absolute inset-[2px] bg-white/5 rounded-lg rotate-45" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Layers size={14} className="text-white/80" strokeWidth={1.5} />
        </div>
        <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-400 rounded-full" />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-black tracking-tight text-white">GEON</span>
        <span className="text-[7px] font-bold uppercase tracking-[0.3em] text-white/40">PAYGUARD</span>
      </div>
    </div>
  );

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
      icon: CircuitBoard,
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
      rating: 5
    },
    {
      name: 'Michael Chen',
      role: 'Marketing Director',
      content: 'The institutional-grade security and professional arbitration give us confidence to run multi-million dollar campaigns.',
      rating: 5
    },
    {
      name: 'Emma Williams',
      role: 'Agency Partner',
      content: 'Managing multiple creator payments has never been easier. The vault system is revolutionary for our workflow.',
      rating: 5
    }
  ];

  const stats = [
    { value: '$50M+', label: 'Protected Volume', icon: Shield },
    { value: '10K+', label: 'Verified Deals', icon: BadgeCheck },
    { value: '99.9%', label: 'Success Rate', icon: Award },
    { value: '<24h', label: 'Avg. Settlement', icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-amber-100 font-sans overflow-x-hidden">
      {/* Navigation */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50 py-3 shadow-lg' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="group">
            <GeonLogo />
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            {['Verified Deals', 'Protocol', 'Security', 'Pricing'].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase().replace(' ', '-')}`} 
                className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-amber-500 transition-all group-hover:w-full" />
              </a>
            ))}
          </nav>

          <div className="flex items-center space-x-4">
            <Link 
              href="/auth/login" 
              className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors px-4 py-2"
            >
              Sign In
            </Link>
            <Link 
              href="/auth/register" 
              className="px-5 py-2.5 bg-slate-900 text-white text-[11px] font-semibold uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl shadow-slate-200 hover:scale-105 flex items-center gap-2"
            >
              <BadgeCheck size={14} />
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-36 pb-20 overflow-hidden bg-gradient-to-b from-white to-slate-50">
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-30" 
             style={{ transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)` }} />
        
        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-slate-200 rounded-full blur-3xl opacity-20 animate-pulse delay-1000" />

        <div className="max-w-7xl mx-auto px-6 text-center relative">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 shadow-sm animate-fade-in">
            <Sparkles size={12} className="text-amber-500" />
            <span>The Gold Standard for Partnership Security</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 mb-6 leading-[1.1]">
            Secure Your <br />
            <span className="text-amber-500 relative">
              Partnerships.
              <span className="absolute -bottom-2 left-0 w-full h-1 bg-amber-200 rounded-full" />
            </span>
          </h1>
          
          <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Eliminate counterparty risk with our institutional-grade escrow engine. 
            Designed for creators, brands, and agencies who refuse to operate on trust alone.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Link 
              href="/auth/register" 
              className="group px-8 py-4 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center shadow-2xl shadow-slate-200 hover:scale-105"
            >
              Create Your First Secure Partnership
              <ArrowRight size={18} className="ml-2 group-hover:translate-x-2 transition-transform" />
            </Link>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100 group-hover:border-amber-200 transition-all">
                    <stat.icon size={20} className="text-slate-700 group-hover:text-amber-500 transition-colors" />
                  </div>
                </div>
                <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-12 border-y border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-slate-400 text-center mb-8">Trusted by Industry Leaders</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-40">
            {['VOGUE', 'GQ', 'DIOR', 'CHANEL', 'NIKE', 'ADIDAS'].map((brand) => (
              <span key={brand} className="text-sm font-bold text-slate-500 tracking-widest">{brand}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Verified Partnerships Section */}
      <section id="verified-deals" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="animate-slide-in-left">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500 mb-4 block">Discover Verified Partnerships</span>
              <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-6">Access Protected <br />High-Value Campaigns.</h2>
              <p className="text-lg text-slate-500 mb-8 leading-relaxed">
                Join an elite ecosystem where influencers connect directly with premium brands. 
                Every campaign comes with guaranteed payment vaults and professional-grade protection.
              </p>
              
              <div className="space-y-4 mb-8">
                {[
                  'Direct access to luxury brand campaigns',
                  'Multi-million dollar agency mandates',
                  'Real-time campaign tracking and analytics'
                ].map((item, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="p-1 bg-emerald-50 rounded-full">
                      <CheckCircle size={16} className="text-emerald-500" />
                    </div>
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>

              <Link 
                href="/auth/register?role=influencer" 
                className="inline-flex items-center text-amber-500 text-[11px] font-bold uppercase tracking-wider hover:gap-3 transition-all group"
              >
                Browse Campaigns <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Campaign Cards */}
            <div className="grid grid-cols-2 gap-4 animate-slide-in-right">
              {[
                { brand: 'LOUIS VUITTON', value: 'KES 150K', type: 'Luxury Fashion' },
                { brand: 'DIOR BEAUTY', value: 'KES 85K', type: 'Beauty Campaign' },
                { brand: 'CARTIER', value: 'KES 250K', type: 'Jewelry Launch' },
                { brand: 'TIFFANY & CO.', value: 'KES 120K', type: 'Brand Ambassador' }
              ].map((campaign, i) => (
                <div key={i} className="group bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-xl transition-all hover:scale-105 cursor-pointer">
                  <div className="text-[9px] font-bold text-amber-500 mb-2 tracking-wider">{campaign.brand}</div>
                  <div className="text-xl font-black text-slate-900 mb-1">{campaign.value}</div>
                  <div className="text-[9px] text-slate-400 mb-3 font-medium">{campaign.type}</div>
                  <div className="flex items-center text-[8px] font-bold text-emerald-600">
                    <BadgeCheck size={10} className="mr-1" /> Verified Partner
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400 mt-8">
            *Actual campaign details available after verification
          </p>
        </div>
      </section>

      {/* Core Infrastructure */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500 mb-4 block">Built for Excellence</span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Institutional-Grade Infrastructure</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">Every feature designed to eliminate friction and build trust between partners.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreInfrastructure.map((item, i) => (
              <div key={i} className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-amber-200 hover:shadow-2xl transition-all duration-300">
                <div className="w-14 h-14 bg-amber-50 rounded-xl flex items-center justify-center text-slate-900 mb-5 group-hover:bg-amber-500 group-hover:text-white transition-all">
                  <item.icon size={24} />
                </div>
                <h3 className="text-base font-bold mb-2">{item.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-4">{item.description}</p>
                <div className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                  <BadgeCheck size={12} />
                  {item.stats}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500 mb-4 block">Trusted by Creators & Brands</span>
            <h2 className="text-4xl font-black tracking-tight text-slate-900">What Our Partners Say</h2>
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
                          <Star key={i} size={16} className="text-amber-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-lg text-slate-700 mb-6 italic">"{testimonial.content}"</p>
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-200 to-amber-300 rounded-full mr-4 flex items-center justify-center">
                          <span className="text-slate-900 font-bold">{testimonial.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{testimonial.name}</p>
                          <p className="text-xs text-slate-400">{testimonial.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center space-x-2 mt-6">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveTestimonial(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === activeTestimonial ? 'w-6 bg-amber-500' : 'w-2 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Settlement Protocol */}
      <section id="protocol" className="py-24 bg-slate-900 text-white mx-6 rounded-[40px] relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />
        
        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400/60 mb-4 block">The Settlement Protocol</span>
            <h2 className="text-4xl font-black tracking-tight text-white">Three Stages of Trust</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2" />
            
            {[
              { n: '01', t: 'Custody', d: 'Agreement is locked. The buyer deposits funds into our secure, neutral vault with real-time verification.', icon: Lock },
              { n: '02', t: 'Verification', d: 'The seller performs the work. Evidence is submitted directly through our secure verification portal.', icon: FileCheck },
              { n: '03', t: 'Disbursement', d: 'Once validated or the timer expires, assets are instantly disbursed to the seller\'s account.', icon: CheckCircle }
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur" />
                <div className="relative bg-white/5 p-8 rounded-2xl border border-white/10 hover:border-amber-500/30 transition-all">
                  <div className="text-5xl font-black text-white/10 mb-4 group-hover:text-amber-500/30 transition-colors">{step.n}</div>
                  <step.icon size={28} className="text-amber-400/80 mb-4" />
                  <h4 className="text-xl font-bold mb-3">{step.t}</h4>
                  <p className="text-slate-400 leading-relaxed text-sm">{step.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-amber-50 to-white rounded-[40px] p-16 text-center relative overflow-hidden border border-amber-100">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1500" />
            
            <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">
              Ready to Secure Your Partnerships?
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto mb-8">
              Join thousands of creators and brands who trust GeonPayGuard for their most important collaborations.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="/auth/register?role=influencer" 
                className="group px-8 py-4 bg-white border-2 border-slate-200 text-slate-900 font-bold text-xs uppercase tracking-widest rounded-xl hover:border-amber-500 transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                <Users size={16} className="mr-2" />
                Join as Influencer
              </Link>
              <Link 
                href="/auth/register?role=business" 
                className="group px-8 py-4 bg-slate-900 text-white font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center shadow-lg hover:shadow-xl"
              >
                <Building2 size={16} className="mr-2" />
                Join as Business
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2">
              <GeonLogoLight />
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed mt-4">
                Institutional-grade security and professional arbitration for modern partnerships. 
                Trust infrastructure for the creator economy.
              </p>
            </div>
            
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Security', 'Pricing', 'API'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Company</h4>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact'].map((item) => (
                  <li key={item}>
                    <a href="#" className="text-xs text-slate-500 hover:text-slate-900 transition-colors">{item}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-200">
            <div className="flex space-x-4 mb-4 md:mb-0">
              {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                <a key={i} href="#" className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-amber-500 transition-all">
                  <Icon size={14} />
                </a>
              ))}
            </div>
            
            <div className="flex gap-8 text-[9px] font-bold uppercase tracking-widest text-slate-400">
              <Link href="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
              <span className="hover:text-slate-900 transition-colors cursor-pointer">Security</span>
            </div>
          </div>
          
          <p className="text-center text-[8px] text-slate-400 mt-8">
            © {new Date().getFullYear()} GEONPAYGUARD. All rights reserved. 
            Independent escrow facilitator. Funds held via regulated payment partners.
          </p>
        </div>
      </footer>

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
        
        .animate-spin-slow {
          animation: spin 8s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .transition-duration-1500 {
          transition-duration: 1500ms;
        }
      `}</style>
    </div>
  );
}