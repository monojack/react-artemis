import { isEmpty, } from 'artemis-utilities/es/js/isEmpty'
import { OperationManager, } from './core/OperationManager'

const NO_LINKS_ERROR = `In order to initialize Artemis Client, you must specify link/s properties on the config object.`

export function ArtemisClient ({ link, links, options = {}, }) {
  if (!link && (!links || isEmpty(links))) {
    throw new Error(NO_LINKS_ERROR)
  }

  const _links =
    link ||
    [ ...links, ].reduce((a, b) => {
      return a.concat(b)
    })

  const operationManager = new OperationManager(_links, options)

  return operationManager
}
