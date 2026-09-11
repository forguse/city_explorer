/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                primary: "#0ea5e9",
                "primary-dark": "#0284c7",
                "secondary-orange": "#f97316",
                "secondary-teal": "#14b8a6",
                "surface-light": "#ffffff",
                "surface-glass": "rgba(255, 255, 255, 0.7)",
                "text-main": "#0f172a",
                "text-muted": "#64748b",
            },
            fontFamily: {
                display: ["Plus Jakarta Sans", "Noto Sans SC", "sans-serif"],
                body: ["Noto Sans SC", "sans-serif"],
            },
            borderRadius: {
                xl: "1rem",
                "2xl": "1.5rem",
                "3xl": "2rem",
                "4xl": "2.5rem",
            },
            boxShadow: {
                soft: "0 8px 30px -4px rgba(0, 0, 0, 0.04)",
                "card-hover": "0 20px 40px -10px rgba(14, 165, 233, 0.15)",
                "glow-primary": "0 0 25px rgba(14, 165, 233, 0.5)",
                "glow-teal": "0 0 20px rgba(20, 184, 166, 0.4)",
                glass: "0 4px 30px rgba(0, 0, 0, 0.1)",
                "inner-light": "inset 0 1px 1px rgba(255, 255, 255, 0.4)",
            },
            animation: {
                "gradient-x": "gradient-x 3s ease infinite",
            },
            keyframes: {
                "gradient-x": {
                    "0%, 100%": {
                        "background-size": "200% 200%",
                        "background-position": "left center",
                    },
                    "50%": {
                        "background-size": "200% 200%",
                        "background-position": "right center",
                    },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
    ],
}
