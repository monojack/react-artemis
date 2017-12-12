import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import replace from 'rollup-plugin-replace'
import uglify from 'rollup-plugin-uglify'
import analyze from 'rollup-analyzer-plugin'

const opts = { limit: 5, filter: [], root: __dirname, }

const env = process.env.NODE_ENV

const config = {
  input: 'src/index.js',
  external: [ 'react', 'artemis-client', 'graphql', ],
  globals: {
    react: 'React',
    'artemis-client': 'ArtemisClient',
    graphql: 'graphql',
  },
  output: {
    format: 'umd',
  },
  name: 'react-artemis',
  sourcemap: true,
  plugins: [
    resolve(),
    babel({
      exclude: '**/node_modules/**',
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify(env),
    }),
    commonjs(),
    analyze(opts),
  ],
  onwarn,
}

if (env === 'production') {
  config.plugins.push(
    uglify({
      compress: {
        pure_getters: true,
        unsafe: true,
        unsafe_comps: true,
        warnings: false,
      },
    })
  )
}

function onwarn (message) {
  const suppressed = [ 'THIS_IS_UNDEFINED', ]

  if (!suppressed.find(code => message.code === code)) {
    // eslint-disable-next-line
    return console.warn(message.message)
  }
}

export default config
