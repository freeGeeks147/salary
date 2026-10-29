// Tailwind CSS v3 config. Rebuild assets/css/site.css after adding new classes:
//   npx tailwindcss@3.4.17 -i src/tailwind.css -o assets/css/site.css --minify
module.exports = {
  content: ["./src/**/*.html", "./assets/js/app.js", "./build.py", "./sectors.py", "./benefits.py"],
  theme: { extend: {} },
  plugins: []
};
