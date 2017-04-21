import {Component, h} from 'preact'
import {Router, route} from 'preact-router'
import {connect} from 'preact-redux'
import {bindActionCreators} from 'redux'

import * as userActions from 'actions/userActions'
import * as apiActions from 'actions/apiActions'
import * as appActions from 'actions/appActions'
import * as documentActions from 'actions/documentActions'
import * as Constants from 'lib/constants'

import Header from 'containers/Header/Header'
import Main from 'components/Main/Main'

import DocumentCreateView from 'views/DocumentCreateView/DocumentCreateView'
import DocumentEditView from 'views/DocumentEditView/DocumentEditView'
import DocumentListView from 'views/DocumentListView/DocumentListView'
import ErrorView from 'views/ErrorView/ErrorView'
import HomeView from 'views/HomeView/HomeView'
import PasswordReset from 'views/PasswordReset/PasswordReset'
import SignInView from 'views/SignInView/SignInView'
import SignOutView from 'views/SignOutView/SignOutView'
import ProfileEditView from 'views/ProfileEditView/ProfileEditView'

import {connectHelper, debounce, isEmpty, slugify, throttle} from 'lib/util'
import Socket from 'lib/socket'
import ConnectionMonitor from 'lib/status'
import Session from 'lib/session'
import apiBridgeClient from 'lib/api-bridge-client'

class App extends Component {
  componentWillMount() {
    const {actions} = this.props

    apiBridgeClient.registerProgressCallback(actions.registerNetworkCall)
    ConnectionMonitor(2000).registerStatusChangeCallback(actions.setNetworkStatus)

    this.sessionStart()
  }

  componentDidMount() {
    const {actions} = this.props

    window.addEventListener('resize', debounce(() => {
      actions.setScreenWidth(window.innerWidth)
    }, 500))
  }

  componentDidUpdate(previousProps) {
    const {state, actions} = this.props
    const previousState = previousProps.state
    const previousPath = previousState.router.locationBeforeTransitions.pathname
    const path = state.router.locationBeforeTransitions.pathname

    // State change: user has signed in
    if (!previousState.user.remote && state.user.remote) {
      const {actions} = this.props

      actions.loadAppConfig()
    }

    // State change: app now has config
    if (!previousState.app.config && state.app.config) {
      // Start socket logic
      this.initialiseSocket(state.app.config)

      actions.loadApis()
    }

    // State change: user has signed out
    if (previousState.user.remote && !state.user.remote) {
      route('/sign-in')
    }

    // State change: app now has APIs
    if (!previousState.api.apis.length && state.api.apis.length) {
      // If the user has been loaded from session, it's possible that some of
      // their details aren't up-to-date, so we get the remote from the API
      // and update the local version.
      //
      // (!) TO DO: update session contents
      if (this.userLoadedFromSession) {
        actions.updateLocalUser()
      }
    }

    if (this.socket && this.socket.getUser() && (this.socket.getRoom() !== path)) {
      this.socket.setRoom(path)
    }
  }

  render() {
    const {history, state} = this.props

    if (state.api.status === Constants.STATUS_FAILED) {
      return (
        <ErrorView type={Constants.STATUS_FAILED} />
      )
    }

    return (
      <Router history={history}>
        <HomeView path="/" authenticate />

        <PasswordReset path="/reset" authenticate/>

        <DocumentListView path="/:group/:collection/document/edit/:documentId?/select/:referencedField?/:page?" authenticate />
        <DocumentListView path="/:collection/document/edit/:documentId?/select/:referencedField?/:page?" authenticate />

        <DocumentEditView path="/:group/:collection/document/edit/:documentId?/:section?" authenticate />
        <DocumentEditView path="/:collection/document/edit/:documentId?/:section?" authenticate />

        <DocumentListView path="/:group/:collection/document/new/:section?/:referencedField?/:page?" authenticate />
        <DocumentListView path="/:collection/document/new/:section?/:referencedField?/:page?" authenticate />

        <DocumentCreateView path="/:group/:collection/document/new/:section?" authenticate />
        <DocumentCreateView path="/:collection/document/new/:section?" authenticate />

        <DocumentListView path="/:group/:collection/documents/:page?" authenticate />
        <DocumentListView path="/:collection/documents/:page?" authenticate />

        <ProfileEditView path="/profile/:section?" authenticate />
        <ProfileEditView path="/profile/select/:referencedField?/:page?" authenticate />

        <SignInView path="/sign-in" />

        <SignOutView path="/sign-out" />

        <ErrorView type={Constants.ERROR_ROUTE_NOT_FOUND} default />
      </Router>
    )
  }

  initialiseSocket(config) {
    const {actions, state} = this.props
    const pathname = state.router.locationBeforeTransitions.pathname
    const user = state.user.remote
    const session = new Session()

    this.socket = new Socket(config.server.port)
      .on('userListChange', data => {
        // Store connected users in state.
        // Filter current user
        actions.setDocumentPeers(data.body.users
          .filter(socketUser => socketUser.handle !== user.handle))
      })
      .setUser(user)
      .setRoom(pathname)
  }

  sessionStart() {
    const {actions, state} = this.props

    new Session().getSession().then(user => {
      if (user && !user.err) {
        actions.setRemoteUser(user)

        this.userLoadedFromSession = true
      } else {
        actions.signOut()
        route('/sign-in')
      }
    })
  }
}

export default connectHelper(
  state => state,
  dispatch => bindActionCreators({...userActions, ...apiActions, ...appActions, ...documentActions}, dispatch)
)(App)
