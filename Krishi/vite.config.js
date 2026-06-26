import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // For GitHub Pages: use the repo name as the base path
  // For local dev and Render: './' works fine
  base: process.env.GITHUB_PAGES === 'true' ? '/Kisan-AI/' : './',
})
