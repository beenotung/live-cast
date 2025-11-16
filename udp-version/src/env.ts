import { config } from 'dotenv'
import populateEnv from 'populate-env'

config()

export let env = {
  OFFSET: '0,0',
  FPS: 0,
}

populateEnv(env, { mode: 'halt' })

console.log('env:', env)
