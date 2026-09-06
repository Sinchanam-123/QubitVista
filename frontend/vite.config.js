import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    rollupOptions: {
      output: {
        // Two dependencies worth their own files.
        //
        // three is by far the largest thing the app ships and exactly one
        // component uses it, so it has no business sitting in the same file as
        // the router and every page. react-router-dom is needed before any
        // route can render, and keeping it separate lets it stay cached across
        // deploys that only change page code.
        //
        // React gets one too, and not for its own sake: every chunk depends on
        // both React and the router, so Rollup gives them the same colour and
        // folds them together. Claim only the router and React rides along
        // inside it — a 163 kB chunk named after the 25 kB of it that is
        // actually routing. Claiming React by path is what keeps each chunk
        // holding what its name says. (By path rather than by the object form,
        // `{ react: ['react'] }`, because React is CommonJS: that form matched
        // the package entry, emitted a 0.03 kB stub, and left the real module
        // where it was.)
        manualChunks(id) {
          const path = id.replace(/\\/g, '/')
          if (!path.includes('/node_modules/')) return undefined
          if (path.includes('/node_modules/three/')) return 'three'
          if (/\/node_modules\/(react-router|@remix-run\/router)/.test(path)) return 'router'
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path)) return 'react'
          return undefined
        }
      }
    }
  }
})
