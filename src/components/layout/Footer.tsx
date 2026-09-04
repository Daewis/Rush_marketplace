import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  Package,
  Twitter,
  Instagram,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Wrench,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function Footer() {
  const { setView } = useAppStore();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const supportEmail = 'support@rush4service.com';

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopiedEmail(true);
    toast.success('Email copied to clipboard!');
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const socialLinks = [
    {
      icon: Instagram,
      href: 'https://www.instagram.com/rush4service_?igsh=bDNyaHlqNTMyZXZ3',
      label: 'Instagram',
      handle: '@rush4service_',
      hoverBorder: 'hover:border-pink-500/40 hover:text-pink-400 hover:bg-pink-500/10',
    },
    {
      icon: Twitter,
      href: 'https://x.com/Rush4Service',
      label: 'X (formerly Twitter)',
      handle: '@Rush4Service',
      hoverBorder: 'hover:border-sky-500/40 hover:text-sky-400 hover:bg-sky-500/10',
    },
  ];

  return (
    <footer id="main-footer" className="bg-slate-950 text-slate-100 mt-20 border-t border-slate-800/80">
      <div className="container mx-auto px-4">
        {/* Main Footer Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 py-12">
          {/* Brand & Socials */}
          <div className="space-y-4">
            <button
              id="footer-brand-button"
              onClick={() => setView('home')}
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90 group text-left"
            >
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                <Package className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight">
                <span className="text-orange-500">RUSH</span>
                <span className="text-slate-300">4SERVICE</span>
              </span>
            </button>

            <p className="text-xs text-slate-400 leading-relaxed">
              Nigeria's premier campus & community logistics and artisan marketplace. Connecting you with verified dispatch riders and skilled service providers on demand.
            </p>

            <div className="pt-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
                Connect With Us
              </span>
              <div className="flex flex-wrap gap-2.5">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={social.label}
                      id={`footer-social-${social.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium transition-all duration-200 ${social.hoverBorder} group`}
                    >
                      <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                      <span>{social.handle}</span>
                      <ExternalLink className="h-3 w-3 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h3 className="font-bold mb-4 text-slate-200 text-xs uppercase tracking-wider">
              Popular Services
            </h3>
            <ul className="space-y-2.5 text-xs md:text-sm">
              {[
                { label: 'Dispatch & Express Delivery', category: 'dispatch_delivery' },
                { label: 'Gadget & Tech Repair', category: 'electronics' },
                { label: 'Plumbing Services', category: 'plumbing' },
                { label: 'Electrical & Solar Installation', category: 'electrical' },
                { label: 'Carpentry & Furniture', category: 'carpentry' },
                { label: 'Cleaning & Laundry Pickups', category: 'cleaning' },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => setView('jobs')}
                    className="text-slate-400 hover:text-orange-500 transition-colors duration-200 hover:pl-1 inline-block text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Navigation */}
          <div>
            <h3 className="font-bold mb-4 text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-orange-500" />
              Quick Navigation
            </h3>
            <ul className="space-y-2.5 text-xs md:text-sm">
              {[
                { label: 'About Rush4Service', view: 'home' },
                { label: 'How It Works & Escrow', view: 'home' },
                { label: 'Verified Artisans & Riders', view: 'providers' },
                { label: 'Browse Job Board', view: 'jobs' },
                { label: 'Post a Service Request', view: 'new-job' },
              ].map((item) => (
                <li key={item.label}>
                  <button
                    onClick={() => setView(item.view as any)}
                    className="text-slate-400 hover:text-orange-500 transition-colors duration-200 hover:pl-1 inline-block text-left"
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Newsletter */}
          <div className="space-y-4">
            <h3 className="font-bold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-orange-500" />
              Support & Contact
            </h3>

            <div className="space-y-3 text-xs md:text-sm text-slate-300">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-orange-500" />
                    Official Support Email
                  </span>
                  <button
                    id="copy-support-email-btn"
                    onClick={handleCopyEmail}
                    className="flex items-center gap-1 text-[11px] text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    {copiedEmail ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-slate-100 font-semibold text-xs hover:text-orange-400 transition-colors flex items-center justify-between group"
                >
                  <span className="truncate">{supportEmail}</span>
                  <ExternalLink className="h-3 w-3 text-slate-500 group-hover:text-orange-400 transition-colors shrink-0 ml-1" />
                </a>
              </div>

              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <Phone className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>+234 800 RUSH 4SRV</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-400 text-xs">
                <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>Lagos, Nigeria (Campus & City Hubs)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Bar */}
        <div className="border-t border-slate-800/80 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} Rush4Service. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => setView('home')} className="hover:text-orange-500 transition-colors">
              Privacy Policy
            </button>
            <button onClick={() => setView('home')} className="hover:text-orange-500 transition-colors">
              Terms of Service
            </button>
          </div>
          <p>Crafted with <span className="text-red-500 text-sm leading-none animate-pulse">❤️</span> in Nigeria</p>
        </div>
      </div>
    </footer>
  );
}