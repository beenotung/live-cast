import { config } from 'dotenv'
import { populateEnv } from 'populate-env'

config({ quiet: true })

export type Position =
  | 'top-right'
  | 'bottom-right'
  | 'top-left'
  | 'bottom-left'
  | 'center'

export let env = {
  PORT: 8100,
  WATERMARK_FILE: 'skip',
  WATERMARK_POSITION: 'top-right' as Position,
}

populateEnv(env, { mode: 'halt' })
