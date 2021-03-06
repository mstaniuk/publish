'use strict'

import {h, Component} from 'preact'
import proptypes from 'proptypes'
import {connect} from 'preact-redux'
import {bindActionCreators} from 'redux'
import {batchActions} from 'lib/redux'
import {route} from '@dadi/preact-router'
import {Keyboard} from 'lib/keyboard'

import * as Constants from 'lib/constants'
import * as appActions from 'actions/appActions'
import * as documentActions from 'actions/documentActions'
import * as documentsActions from 'actions/documentsActions'
import * as fieldComponents from 'lib/field-components'

import APIBridge from 'lib/api-bridge-client'
import {createRoute} from 'lib/router'
import {connectHelper} from 'lib/util'

import ErrorMessage from 'components/ErrorMessage/ErrorMessage'
import SpinningWheel from 'components/SpinningWheel/SpinningWheel'
import SyncTable from 'components/SyncTable/SyncTable'

/**
 * A table view with a list of documents.
 */
class DocumentList extends Component {
  static propTypes = {
    /**
     * The global actions object.
     */
    actions: proptypes.object,

    /**
     * The API to operate on.
     */
    api: proptypes.object,

    /**
     * The collection to operate on.
     */
    collection: proptypes.object,

    /**
     * The parent collection to operate on, when dealing with a reference field.
     */
    collectionParent: proptypes.object,

    /**
     * When on a reference field, contains the ID of the parent document.
     */
    documentId: proptypes.string,

    /**
     * The list of fields to retrieve.
     */
    fields: proptypes.array,

    /**
     * The hash map of active filters.
     */
    filters: proptypes.object,

    /**
    * A callback to be used to obtain the base URL for the given page, as
    * determined by the view.
    */
    onBuildBaseUrl: proptypes.func,

    /**
     * A callback to be fired if the container wants to attempt changing the
     * page title.
     */
    onPageTitle: proptypes.func,

    /**
     * A function responsible for rendering the documents. It is called with the
     * following named parameters:
     *
     * - collection
     * - config
     * - documentId
     * - documents
     * - onBuildBaseUrl
     * - onSelect
     * - order
     * - referencedField
     * - selectedDocuments
     * - sort
     */
    onRenderDocuments: proptypes.func,

    /**
     * A function responsible for rendering an empty list of documents.
     */
    onRenderEmptyDocumentList: proptypes.func,

    /**
     * The order used to sort the documents by the `sort` field.
     */
    order: proptypes.oneOf(['asc', 'desc']),

    /**
     * The number of the current active page.
     */
    page: proptypes.number,

    /**
     * The name of a reference field currently being edited (if any).
     */
    referencedField: proptypes.string,

    /**
     * The name of the field currently being used to sort the documents.
     */
    sort: proptypes.string,

    /**
     * The global state object.
     */
    state: proptypes.object
  }

  static defaultProps = {
    onPageTitle: (function () {})
  }

  constructor(props) {
    super(props)

    this.keyboard = new Keyboard()
  }

  componentDidMount() {
    const {
      onBuildBaseUrl,
      page,
      state
    } = this.props
    const currentPage = Number(page)
    const nextPage = currentPage + 1
    const previousPage = Math.abs(currentPage -1)

    // this.keyboard.on('cmd+right')
    //   .do(cmd => route(buildUrl(...onBuildBaseUrl(), nextPage)))
    // this.keyboard.on('cmd+left')
    //   .do(cmd => route(buildUrl(...onBuildBaseUrl(), previousPage)))
  }

  componentDidUpdate(prevProps) {
    const {
      actions,
      collection,
      page,
      referencedField,
      state
    } = this.props
    const {app, api, documents} = state
    const {
      isDeleting,
      isLoading,
      isSaving,
      selected: selection
    } = documents
    const {
      isDeleting: wasDeleting,
      isLoading: wasLoading,
      isSaving: wasSaving
    } = prevProps.state.documents

    // If we have just loaded a list of documents for a nested document, let's
    // see if the list of selected documents needs to be updated.
    if (referencedField && wasLoading && !isLoading) {
      const document = Object.assign(
        {},
        state.document.remote,
        state.document.local
      )
      const referenceValue = (Array.isArray(document[referencedField])
        ? document[referencedField]
        : [document[referencedField]]
      ).filter(Boolean)

      // If the referenced value has a set value and the current selection does
      // not reflect it, we must update the selection.
      if (referenceValue.length > 0 && selection.length === 0) {
        actions.setDocumentSelection(referenceValue)
      }
    }

    const {path: collectionPath} = collection || {}
    const {path: previousCollectionPath} = prevProps.collection || {}
    const {search} = state.router.locationBeforeTransitions
    const {search: previousSearch} = prevProps.state.router.locationBeforeTransitions
    const hasJustDeleted = wasDeleting && !isDeleting
    const hasJustSaved = wasSaving && !isSaving
    const resourceIsTheSame = collectionPath === previousCollectionPath &&
      referencedField === prevProps.referencedField &&
      page === prevProps.page &&
      JSON.stringify(search) === JSON.stringify(previousSearch)

    if (
      !app.config ||
      api.apis.length === 0 ||
      !collection ||
      isLoading ||
      (!hasJustDeleted && !hasJustSaved && documents.list && resourceIsTheSame)
    ) {
      return
    }

    this.fetchDocuments()
  }

  componentWillUpdate(nextProps) {
    const {
      actions,
      collection,
      state
    } = this.props
    const currentCollection = collection || {}
    const nextCollection = nextProps.collection || {}

    if (currentCollection.path !== nextCollection.path) {
      actions.setDocumentSelection([])

      // This is required to recover from an error. If the document list has
      // errored and we're about to navigate to a different collection, we
      // clear the error state by setting the status to IDLE and let the
      // container fetch again.
      if (state.documents.remoteError) {
        actions.setDocumentListStatus(Constants.STATUS_IDLE)
      }
    }
  }

  componentWillMount() {
    const {collection, state} = this.props
    const {app, api, documents} = state

    if (
      app.config &&
      api.apis.length > 0 &&
      collection &&
      !documents.isLoading
    ) {
      this.fetchDocuments()
    }
  }

  componentWillUnmount() {
    const {actions} = this.props

    this.keyboard.off()
    actions.clearDocumentList()
  }

  fetchDocuments() {
    const {
      actions,
      api,
      collection,
      collectionParent,
      fields,
      filters = {},
      order,
      page,
      documentId,
      referencedField,
      sort,
      state
    } = this.props

    if (state.documents.remoteError) {
      return
    }

    if (filters.$selected === true) {
      const {selected: selectedDocuments} = state.documents
      const newDocumentList = {
        results: selectedDocuments,
        metadata: {
          limit: selectedDocuments.length,
          offset: 0,
          page: 1,
          totalCount: selectedDocuments.length,
          totalPages: 1
        }
      }

      return actions.setDocumentList(newDocumentList)
    }

    const count = (collection.settings && collection.settings.count)
      || 20

    // This is the object we'll send to the `fetchDocuments` action. If we're
    // dealing with a reference field select, we'll pass this object to any
    // existing `beforeReferenceSelect` hook so that field components have the
    // chance to modify the criteria used to retrieve documents from the API.
    const fetchObject = {
      api,
      collection,
      count,
      fields,
      filters,
      page,
      parentCollection: collectionParent,
      parentDocumentId: documentId,
      referencedField,
      sortBy: sort,
      sortOrder: order
    }

    return actions.fetchDocuments(fetchObject)
  }

  render() {
    const {
      actions,
      api,      
      collection,
      collectionParent,
      documentId,
      onBuildBaseUrl,
      onPageTitle,
      onRenderDocuments,
      onRenderEmptyDocumentList,
      order,
      referencedField,
      sort,
      state
    } = this.props
    const config = state.app.config
    const documents = state.documents
    
    if (state.api.isLoading || documents.isLoading) {
      return (
        <SpinningWheel/>
      )
    }

    if (documents.remoteError || (collection === null)) {
      return (
        <ErrorMessage
          type={Constants.ERROR_ROUTE_NOT_FOUND}
        />
      )      
    }

    if (
      !documents.list ||
      !documents.list.results ||
      !collection
    ) {
      return null
    }

    // Setting page title depending on whether we are listing documents on the
    // top-level of a collection or from a reference field.
    if (referencedField && collectionParent) {
      const fieldSchema = collectionParent.fields[referencedField]

      onPageTitle(`Select ${(fieldSchema.label || referencedField).toLowerCase()}`)
    } else {
      onPageTitle(
        (collection.settings && collection.settings.description) || collection.name
      )      
    }

    const {results: listItems} = documents.list

    if (listItems.length === 0) {
      if (typeof onRenderEmptyDocumentList !== 'function') {
        return null
      }

      return onRenderEmptyDocumentList()
    }

    if (typeof onRenderDocuments !== 'function') {
      return null
    }

    // The list of selected documents is persisted in the store as an array of
    // IDs. However, for the components downstream is more efficient to store
    // this data as a hash map, since each row will need to lookup this object
    // to assess whether it is selected or not. Making it a hash map means that
    // said lookup can be done in O(1) rather than O(n) time.
    // We create two objects: `selectedDocuments` and `selectedDocumentsInView`.
    // The first one contains all selected documents, mapping their IDs to a
    // `true` Boolean. The second one contains all selected documents that are
    // currently into view, mapping their index to a `true` Boolean.
    const selectedDocuments = {}
    const selectedDocumentsInView = documents.selected
      .reduce((result, selectedDocument) => {
        const {_id: id} = selectedDocument
        const matchingDocumentIndex = listItems.findIndex(item => {
          return item._id === id
        })

        if (matchingDocumentIndex !== -1) {
          result[matchingDocumentIndex] = selectedDocument  
        }

        selectedDocuments[id] = selectedDocument

        return result
      }, {})

    // The new selection is formed by merging the new selection hash with any
    // previously selected documents that are not in view (i.e. are on a
    // different page).
    const onSelectFn = newSelection => {
      Object.keys(newSelection).forEach(index => {
        const document = listItems[index]

        selectedDocuments[document._id] = newSelection[index]
          ? document
          : undefined
      })

      // Converting a new selection hash to the array format that the store
      // is expecting.
      const newSelectionArray = Object.keys(selectedDocuments)
        .filter(id => Boolean(selectedDocuments[id]))
        .map(id => selectedDocuments[id])

      actions.setDocumentSelection(newSelectionArray)
    }

    return onRenderDocuments({
      api,
      collection,
      collectionParent,
      config,
      documentId,
      documents: listItems,
      onBuildBaseUrl,
      onSelect: onSelectFn,
      order,
      referencedField,
      selectedDocuments: selectedDocumentsInView,
      sort
    })
  }
}

export default connectHelper(
  state => ({
    api: state.api,
    app: state.app,
    document: state.document,
    documents: state.documents,
    router: state.router,
    user: state.user
  }),
  dispatch => bindActionCreators({
    ...appActions,
    ...documentActions,
    ...documentsActions
  }, dispatch)
)(DocumentList)
