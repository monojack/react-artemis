import { Component, Children, } from 'react'
import PropTypes from 'prop-types'

export default class Provider extends Component {
  static propTypes = {
    client: PropTypes.shape({
      query: PropTypes.func.isRequired,
      mutate: PropTypes.func.isRequired,
      subscribe: PropTypes.func.isRequired,
    }).isRequired,
    children: PropTypes.element.isRequired,
    store: PropTypes.object,
  }

  static childContextTypes = {
    client: PropTypes.object.isRequired,
    store: PropTypes.object,
  }

  getChildContext () {
    return { client: this.client, store: this.store, }
  }

  constructor (props, context) {
    super(props, context)
    this.client = props.client
    this.store = props.store
  }

  render () {
    return Children.only(this.props.children)
  }
}
