import React, { Component, } from 'react'
import PropTypes from 'prop-types'
import { parse, } from 'graphql'

import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'
import {
  isNil,
  isEmpty,
  shallowEqual,
  mapObject,
  executableOperationsMap,
} from 'artemis-utilities'

import { propNameOr, mergeOperations, } from '../utils'

export function withOperations (sources, config) {
  const mutationsKey = propNameOr('mutations')(config)
  const queriesKey = propNameOr('queries')(config)

  const computeOptions = props =>
    config.options && typeof config.options === 'function'
      ? config.options(props)
      : config.options || {}

  return function createWithOperationsComponent (BaseComponent) {
    invariant(
      typeof BaseComponent === 'function',
      `You must pass a component to the function returned by blips. Instead received ${JSON.stringify(
        BaseComponent
      )}`
    )

    class WithOperations extends Component {
      static displayName = `withOperations(${BaseComponent.displayName ||
        BaseComponent.name ||
        'Component'})`

      static WrappedComponent = BaseComponent

      static contextTypes = {
        client: PropTypes.object.isRequired,
      }

      constructor (props, context) {
        super(props, context)

        this.client = context.client
        this.options = computeOptions(props)
        this.parsedData = this.parse(sources)
      }

      componentWillMount () {
        this.resolve()
      }

      componentWillReceiveProps (nextProps) {
        const nextOptions = computeOptions(nextProps)

        if (shallowEqual(this.options, nextOptions)) return

        this.options = { ...nextOptions, }

        this.resolve()
      }

      parse = sources => {
        const documents = sources.map(parse)
        const operations = documents
          .map(executableOperationsMap)
          .reduce(mergeOperations, {})

        return {
          sources,
          documents,
          operations,
        }
      }

      resolve = () => {
        const {
          operations: {
            query: queries = {},
            mutation: mutations = {},
            fetch: fetches = {},
          },
        } = this.parsedData
        this.operations = {
          [queriesKey]: {
            ...mapObject(this.query)(queries),
            ...mapObject(this.fetch)(fetches),
          },
          [mutationsKey]: mapObject(this.mutate)(mutations),
        }
      }

      query = document => (options = this.options) => {
        return this.client.query(document, options)
      }

      mutate = document => (options = this.options) => {
        return this.client.mutate(document, options)
      }

      fetch = document => (options = this.options) => {
        return this.client.fetch(document, options)
      }

      render () {
        const props = Object.entries(this.operations).reduce(
          (acc, [ key, value, ]) => {
            if (isEmpty(value) || isNil(value)) return acc
            return {
              ...acc,
              [key]: {
                ...(acc[key] || {}),
                ...value,
              },
            }
          },
          this.props
        )

        return <BaseComponent {...props} />
      }
    }

    return hoistNonReactStatics(WithOperations, BaseComponent, {})
  }
}
