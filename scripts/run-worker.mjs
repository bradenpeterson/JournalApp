#!/usr/bin/env node
/**
 * Starts the BullMQ worker. Loads `.env.local` when present (local dev); 
 * On Railway, env vars come from the platform — no file required.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const envLocal = resolve(root, '.env.local')
const tsxCli = resolve(root, 'node_modules/tsx/dist/cli.mjs')
const entry = resolve(root, 'workers/index.ts')

const nodeArgs = existsSync(envLocal) ? [`--env-file=${envLocal}`, tsxCli, entry] : [tsxCli, entry]

const child = spawn(process.execPath, nodeArgs, {
  stdio: 'inherit',
  cwd: root,
  env: process.env,
})

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 1)
})
