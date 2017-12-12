import { withOperations, } from '../components/WithOperations'

export default (...args) => {
  let config = {}

  if (typeof args[args.length - 1] === 'object') {
    config = args.pop()
  }
  const sources = [ ...args, ]

  return withOperations(sources, config)
}
