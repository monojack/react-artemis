import React, { Component, } from 'react'
import PropTypes from 'prop-types'
import { parse, } from 'graphql'

import hoistNonReactStatics from 'hoist-non-react-statics'
import invariant from 'invariant'
import {
  shallowEqual,
  mapObject,
  executableOperationsMap,
  subscriptionToQuery,
} from 'artemis-utilities'

import { propNameOr, computeNextState, mergeOperations, } from '../utils'

export function graphql (sources, config) {
  const dataKey = propNameOr('data')(config)
  const mutationsKey = propNameOr('mutations')(config)
  const queriesKey = propNameOr('queries')(config)

  const promiseRegistry = []
  const registerPromise = promiseRegistry.push.bind(promiseRegistry)
  const clearPromiseRegistry = () => (promiseRegistry.length = 0)

  const subscriptionRegistry = []
  const registerSubscription = subscriptionRegistry.push.bind(
    subscriptionRegistry
  )
  const clearSubscriptionRegistry = () => (subscriptionRegistry.length = 0)
  const cancelSubscriptions = () => {
    for (const subscription of subscriptionRegistry) {
      subscription.unsubscribe()
    }
  }

  const updateBatch = []

  const computeOptions = props =>
    config.options && typeof config.options === 'function'
      ? config.options(props)
      : config.options || {}

  return function createGraphQLComponent (BaseComponent) {
    invariant(
      typeof BaseComponent === 'function',
      `You must pass a component to the function returned by graphql. Instead received ${JSON.stringify(
        BaseComponent
      )}`
    )

    class ArtemisGraphQL extends Component {
      static displayName = `ArtemisGraphQL(${BaseComponent.displayName ||
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

      state = {
        [dataKey]: {
          loading: true,
        },
      }

      componentWillMount () {
        this.resolve()
      }

      componentWillReceiveProps (nextProps) {
        const nextOptions = computeOptions(nextProps)

        if (shallowEqual(this.options, nextOptions)) return

        this.options = { ...nextOptions, }

        cancelSubscriptions()
        clearSubscriptionRegistry()
        clearPromiseRegistry()

        this.cancelResolve()
        this.resolve()
      }

      cancelResolve = () => {}

      batchUpdateState = (list = updateBatch, state = this.state, force) => {
        if (list.length === 0 && !force) return
        this.setState(
          computeNextState(
            list,
            {
              dataKey,
              queriesKey,
              mutationsKey,
            },
            state
          )
        )
        updateBatch.length = 0
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
        let cancel = false
        const {
          operations: {
            query: queries = {},
            mutation: mutations = {},
            subscription: subscriptions = {},
          },
        } = this.parsedData

        for (const subscription of Object.values(subscriptions)) {
          this.subscribe(subscription)(this.options)
          registerPromise(
            this.query(subscriptionToQuery(subscription))(this.options)
          )
        }

        for (const query of Object.values(queries)) {
          registerPromise(this.query(query)(this.options))
        }

        registerPromise(
          Promise.resolve({
            [queriesKey]: {
              ...mapObject(this.query)(queries),
            },
            [mutationsKey]: mapObject(this.mutate)(mutations),
          })
        )

        Promise.all(promiseRegistry).then(res => {
          !cancel &&
            this.batchUpdateState(res, { [dataKey]: { loading: false, }, }, true)
        })

        this.cancelResolve = () => (cancel = true)
      }

      query = document => (options = this.options) => {
        return this.client.query(document, options)
      }

      mutate = document => (options = this.options) => {
        return this.client.mutate(document, options)
      }

      subscribe = document => async (options = this.options) => {
        const observable = await this.client.subscribe(document, options)

        registerSubscription(
          observable.subscribe(res => {
            updateBatch.push(res)
            process.nextTick(this.batchUpdateState)
          })
        )
      }

      render () {
        const props = Object.entries(this.state).reduce(
          (acc, [ key, value, ]) => ({
            ...acc,
            [key]: {
              ...(acc[key] || {}),
              ...value,
            },
          }),
          this.props
        )

        return <BaseComponent {...props} />
      }
    }

    return hoistNonReactStatics(ArtemisGraphQL, BaseComponent, {})
  }
}
