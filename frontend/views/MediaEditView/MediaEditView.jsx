'use strict'

import {h, Component} from 'preact'
import {bindActionCreators} from 'redux'
import {connectHelper, setPageTitle} from 'lib/util'
import {Format} from 'lib/util/string'
import {route} from '@dadi/preact-router'
import {URLParams} from 'lib/util/urlParams'

import * as Constants from 'lib/constants'
import * as documentActions from 'actions/documentActions'

import DocumentEdit from 'containers/DocumentEdit/DocumentEdit'
import DocumentField from 'containers/DocumentField/DocumentField'
import MediaEditToolbar from 'containers/MediaEditToolbar/MediaEditToolbar'
import Header from 'containers/Header/Header'
import Main from 'components/Main/Main'
import MediaEditor from 'containers/MediaEditor/MediaEditor'
import Page from 'components/Page/Page'

class MediaEditView extends Component {
  constructor(props) {
    super(props)

    this.sections = []
  }

  componentDidUpdate(prevProps) {
    const {documentId} = this.props
    const method = documentId ? 'edit' : 'new'

    setPageTitle(`${Format.sentenceCase(method)} document`)  
  }

  groupFieldsIntoPlacements(fields) {
    let placements = {
      main: [],
      sidebar: []
    }

    fields.forEach(field => {
      // Unless the Publish block specifically states that the field should be
      // placed on the sidebar, we stick it in the main placement.
      let placement = field.publish && field.publish.placement === 'sidebar' ?
        placements.sidebar :
        placements.main

      placement.push(field)
    })

    return placements
  }

  // Groups fields by section based on the `section` property of the `publish`
  // block present in their schema. It returns an array with objects containing
  // the following properties:
  //
  // - `fields`: array containing the schema of the fields in the section
  // - `hasErrors`: Boolean indicating whether there are fields with errors
  //      in the section
  // - `isActive`: Boolean indicating whether the section is the one currently
  //      active.
  // - `name`: name of the section
  // - `slug`: slug of the section
  groupFieldsIntoSections(fields) {
    const {
      section: activeSectionSlug,
      state
    } = this.props
    const document = state.document

    let sections = {}
    let sectionsArray = null
    let other = []

    Object.keys(fields).forEach(fieldSlug => {
      const field = Object.assign({}, fields[fieldSlug], {
        _id: fieldSlug
      })
      const section = (field.publish && field.publish.section) || 'Other'

      sections[section] = sections[section] || []
      sections[section].push(field)
    })

    // Converting sections to an array including slug
    if (Object.keys(sections).length) {
      sectionsArray = Object.keys(sections).map((sectionName, index) => {
        const fields = sections[sectionName]
        const sectionHasErrors = document.validationErrors
          && fields.some(field => document.validationErrors[field._id])
        const slug = Format.slugify(sectionName)
        
        // We mark this as the currently active section if there is a section
        // in the URL and this is the one that matches it, or there isn't one
        // in the URL and this is the first one.
        const isActive = activeSectionSlug && activeSectionSlug.length ?
          activeSectionSlug === slug :
          index === 0

        // Takes the fields and groups them into a `main` and `sidebar` arrays.
        const fieldsInPlacements = this.groupFieldsIntoPlacements(fields)

        let section = {
          fields: fieldsInPlacements,
          hasErrors: sectionHasErrors,
          href: this.handleBuildBaseUrl({
            section: slug
          }),
          isActive,
          name: sectionName,
          slug
        }

        return section
      })
    }

    return sectionsArray
  }

  handleBuildBaseUrl({
    createNew,
    documentId = this.props.documentId,
    group = this.props.group,
    search = new URLParams(window.location.search).toObject(),
    section = this.props.section
  } = {}) {
    let urlNodes = ['media']

    if (createNew) {
      urlNodes.push('new')
    } else {
      urlNodes.push(documentId)
    }

    urlNodes.push(section)

    let url = urlNodes.filter(Boolean).join('/')

    if (search && Object.keys(search).length > 0) {
      url += `?${new URLParams(search).toString()}`
    }

    return `/${url}`
  }

 render() {
    const {
      documentId,
      section,
      state
    } = this.props
    const currentApi = state.api.apis[0]

    return (
      <Page>
        <Header
          currentCollection={Constants.MEDIA_COLLECTION_SCHEMA}
        />

        <MediaEditToolbar
          api={currentApi}
          collection={Constants.MEDIA_COLLECTION_SCHEMA}
          documentId={documentId}
          onBuildBaseUrl={this.handleBuildBaseUrl.bind(this)}
          section={section}
        />

        <Main>
          <DocumentEdit
            api={currentApi}
            collection={Constants.MEDIA_COLLECTION_SCHEMA}
            documentId={documentId}
            onBuildBaseUrl={this.handleBuildBaseUrl.bind(this)}
            onPageTitle={setPageTitle}
            onRender={documentData => (
              <MediaEditor
                api={currentApi}
                documentData={documentData}
              />
            )}
            section={section}
          />
        </Main>
        
      </Page>
    )
  }

  // shouldComponentUpdate(nextProps, nextState) {
  //   const {
  //     collection,
  //     documentId,
  //     section
  //   } = this.props
  //   const method = documentId ? 'edit' : 'new'

  //   if (collection && section && this.sections.length) {
  //     let sectionMatch = this.sections.find(item => {
  //       return item.slug === section
  //     })

  //     // If the section is not valid, we redirect to the first valid one.
  //     if (!sectionMatch && !this.isRedirecting) {
  //       this.isRedirecting = true

  //       let redirectUrl = this.handleBuildBaseUrl({
  //         section: this.sections[0].slug
  //       })

  //       route(redirectUrl)

  //       return false
  //     }
  //   }
  // }
}

export default connectHelper(
  state => ({
    api: state.api,
    document: state.document
  }),
  dispatch => bindActionCreators({
    ...documentActions
  }, dispatch)
)(MediaEditView)
