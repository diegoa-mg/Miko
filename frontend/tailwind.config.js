/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"],       // texto en general (default)
        logo: ["Quicksand", "sans-serif"],      // nombre y logotipo
        title: ["'Playfair Display'", "serif"], // títulos principales
      },
    },
  },
  plugins: [],
};
