import { defineConfig } from 'vite'

// Use VITE_PUBLIC_PATH or fallback to repository name derived base for GitHub Pages
const pkgName = process.env.npm_package_name
const base = process.env.VITE_PUBLIC_PATH || (pkgName ? `/${pkgName}/` : '/')

export default defineConfig({
  base,
})
