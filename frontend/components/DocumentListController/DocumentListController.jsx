'use strict'

import {h, Component} from 'preact'
import {route} from '@dadi/preact-router'
import Button from 'components/Button/Button'
import DocumentFilters from 'containers/DocumentFilters/DocumentFilters'
import proptypes from 'proptypes'
import styles from './DocumentListController.css'

/**
 * A controller bar for a list of documents.
 */
export default class DocumentListController extends Component {
  static propTypes = {
    /**
     * The collection to operate on.
     */
    collection: proptypes.object,

    /**
     * The link to a "Create new" button. If not present, the button will not
     * be rendered.
     */
    createNewHref: proptypes.string,

    /**
     * The ID of the document being operated on.
     */
    documentId: proptypes.string,    

    /**
     * Whether to enable filters.
     */
    enableFilters: proptypes.bool,

    /**
    * A callback to be used to obtain the base URL for the given page, as
    * determined by the view.
    */
    onBuildBaseUrl: proptypes.func,

    /**
     * When selecting a value for a referenced field, this should contain its
     * name.
     */
    referencedField: proptypes.string,

    /**
     * The hash map of search parameters.
     */
    search: proptypes.object
  }

  render() {
    const {
      collection,
      createNewHref,
      enableFilters,
      search = {}
    } = this.props

    if (!collection) {
      return null
    }

    return (
      <div class={styles.wrapper}>
        <div class={styles.filters}>
          {enableFilters &&
            <DocumentFilters
              collection={collection}
              filters={search.filter}
              onUpdateFilters={this.handleFiltersUpdate.bind(this)}
            />
          }
        </div>

        <div class={styles.actions}>
          {createNewHref &&
            <div class={styles['new-button-large']}>
              <Button
                accent="save"
                href={createNewHref}
                type="fill"
              >Create new</Button>
            </div>
          }

          {createNewHref &&
            <div class={styles['new-button-small']}>
              <Button
                accent="save"
                href={createNewHref}
                type="fill"
              >New</Button>
            </div>
          }
        </div>
      </div>
    )
  }

  handleGoToPage(event) {
    const {onBuildBaseUrl} = this.props
    const inputValue = event.target.value
    const parsedValue = parseInt(inputValue)

    // If the input is not a valid positive integer number, we return.
    if ((parsedValue.toString() !== inputValue) || (parsedValue <= 0)) return

    // If the number inserted is outside the range of the pages available,
    // we return.
    if (parsedValue > metadata.totalPages) return

    let url = onBuildBaseUrl({
      page: parsedValue
    })

    route(url)
  }

  handleFiltersUpdate(newFilters) {
    const {
      documentId,
      onBuildBaseUrl,
      referencedField,
      search
    } = this.props
    const newFilterValue = Object.keys(newFilters).length > 0 ?
      newFilters :
      null
    const newSearch = Object.assign({}, search, {
      filter: newFilterValue
    })
    const newUrl = onBuildBaseUrl({
      createNew: Boolean(referencedField && !documentId),
      referenceFieldSelect: referencedField,
      search: newSearch
    })

    route(newUrl)
  }
}
