import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { venue } from '../data/config';

export default function Header({ current, setCurrent }) {
  const [open, setOpen] = useState(false);
  const items = [
    { id: 'home', label: 'Home' },
    { id: 'contatti', label: 'Contatti' },
    { id: 'prenotazioni', label: 'Prenotazioni' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <button className="flex items-center gap-3 text-left" onClick={() => setCurrent('home')}>
          <img
            src={venue.logoPath}
            alt={`Logo ${venue.name}`}
            className="h-12 w-12 rounded-full object-cover ring-1 ring-slate-200"
          />
          <div>
            <div className="text-xl font-bold text-slate-900">{venue.name}</div>
            <div className="text-sm text-slate-500">{venue.tagline}</div>
          </div>
        </button>

        <nav className="hidden gap-2 md:flex">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrent(item.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                current === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="rounded-xl border border-slate-200 p-2 md:hidden" onClick={() => setOpen((v) => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrent(item.id);
                  setOpen(false);
                }}
                className={`rounded-xl px-4 py-3 text-left text-sm font-medium ${
                  current === item.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
