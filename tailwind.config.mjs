/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			/* HDIL-IPCA site palette v3 (Glass Serenity) — hex literals so
  			   opacity modifiers (bg-ink/95, text-white/60) work. Keep in
  			   sync with --site-* in globals.css.
  			   madder = primary accent (indigo), alarm = emergency red. */
  			ivory: '#EEF2F7',
  			surface: '#FFFFFF',
  			ink: '#171B26',
  			body: '#525A6B',
  			line: '#DFE5EE',
  			madder: {
  				DEFAULT: '#4F46E2',
  				deep: '#4338CA'
  			},
  			grape: '#7C3AED',
  			alarm: {
  				DEFAULT: '#DC2626',
  				deep: '#B91C1C'
  			},
  			ok: '#10B981',
  			/* shadcn tokens — used by admin/dashboard */
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		fontFamily: {
  			display: ['var(--font-display)', 'Georgia', 'serif'],
  			sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  			bevan: ['Bevan', 'serif']
  		},
  		maxWidth: {
  			site: '85rem'
  		},
  		transitionTimingFunction: {
  			'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
  			'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
