import { DEFAULT_ROOT, parseArgs, state, main } from './cezar-lib.mjs'
main(() => {
  const { options } = parseArgs(process.argv.slice(2))
  const data = state(options.root ?? DEFAULT_ROOT)
  if (options.json) return console.log(JSON.stringify({ base: data.base, tasks: data.rows }, null, 2))
  console.log(`Base: ${data.base.branch} @ ${data.base.commit.slice(0, 12)}`)
  for (const row of data.rows) console.log(`${row.state.padEnd(8)} ${row.id.padEnd(8)} ${row.owner} | ${row.estimateHours}h | ${row.title}${row.blockers.length ? ` | ${row.blockers.join('; ')}` : ''}`)
  console.log('\nStatus w backlogu nie zastępuje odbioru. Zależności odblokowuje odbiór scalonego commita, zapisany w .local/completions.json.')
})
