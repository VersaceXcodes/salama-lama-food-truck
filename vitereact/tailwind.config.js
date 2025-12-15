/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
				card: "var(--radius-card)", // 18px
				btn: "var(--radius-btn)", // 16px
			},
			colors: {
				brand: {
					1: "#2C2018", // Dark Brown - Primary dark color
					2: "#DEBF93", // Beige - Light accent
					3: "#80604A", // Medium Brown - Secondary
					4: "#989F88", // Sage Green - Tertiary
					5: "#CD3A1D", // Red Orange - Accent/CTA
					6: "#85878E", // Gray - Neutral
				},
				primary: {
					bg: "var(--primary-bg)",
					text: "var(--primary-text)",
					DEFAULT: "var(--primary-text)",
				},
				accent: {
					DEFAULT: "var(--accent-color)",
				},
				border: {
					light: "var(--border-light)",
				},
			},
			boxShadow: {
				soft: "var(--shadow-soft)",
				"soft-md": "var(--shadow)",
				"soft-lg": "var(--shadow-md)",
			},
			spacing: {
				'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
				'bottom-bar': 'var(--bottom-bar-height)',
			},
			maxWidth: {
				container: '1280px', // 6xl equivalent for max-w-6xl
			},
			keyframes: {
				"accordion-down": {
					from: {
						height: "0",
					},
					to: {
						height: "var(--radix-accordion-content-height)",
					},
				},
				"accordion-up": {
					from: {
						height: "var(--radix-accordion-content-height)",
					},
					to: {
						height: "0",
					},
				},
				"slide-up": {
					from: {
						transform: "translateY(100%)",
						opacity: "0",
					},
					to: {
						transform: "translateY(0)",
						opacity: "1",
					},
				},
				"slide-down": {
					from: {
						transform: "translateY(-100%)",
						opacity: "0",
					},
					to: {
						transform: "translateY(0)",
						opacity: "1",
					},
				},
				"fade-in": {
					from: {
						opacity: "0",
					},
					to: {
						opacity: "1",
					},
				},
			},
			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
				"slide-up": "slide-up 0.3s ease-out",
				"slide-down": "slide-down 0.3s ease-out",
				"fade-in": "fade-in 0.2s ease-out",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};
