import { Extension } from '@tiptap/core'
import Image from '@tiptap/extension-image'
import { Plugin, PluginKey } from '@tiptap/pm/state'

/** Transaction meta: skip pending-delete sync (programmatic `setContent` / hydration). */
export const SKIP_ENTRY_IMAGE_CLEANUP_META = 'skipEntryImageCleanup' as const

/**
 * Image node with optional `entryImageId` (row id from `entry_images`).
 * Persisted in JSON + `data-entry-image-id` when rendered to HTML.
 */
export const EntryImage = Image.extend({
  name: 'image',
  addAttributes() {
    return {
      ...this.parent?.(),
      entryImageId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-entry-image-id'),
        renderHTML: (attributes) => {
          if (!attributes.entryImageId) return {}
          return { 'data-entry-image-id': String(attributes.entryImageId) }
        },
      },
    }
  },
}).configure({
  inline: false,
  allowBase64: false,
})

const pendingSyncKey = new PluginKey('entryImagePendingDeleteSync')

/**
 * Tracks `entryImageId`s removed from the document so Storage can be deleted **after** a successful
 * entry save (undo restores the node and removes the id from the pending set).
 */
export function createEntryImagePendingDeleteSync(pendingRef: { current: Set<string> }) {
  return Extension.create({
    name: 'entryImagePendingDeleteSync',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: pendingSyncKey,
          appendTransaction(transactions, oldState, newState) {
            if (transactions.some((tr) => tr.getMeta(SKIP_ENTRY_IMAGE_CLEANUP_META))) {
              return null
            }
            if (!transactions.some((tr) => tr.docChanged)) {
              return null
            }

            const oldIds = new Set<string>()
            oldState.doc.descendants((node) => {
              if (node.type.name === 'image' && node.attrs.entryImageId) {
                oldIds.add(String(node.attrs.entryImageId))
              }
            })
            const newIds = new Set<string>()
            newState.doc.descendants((node) => {
              if (node.type.name === 'image' && node.attrs.entryImageId) {
                newIds.add(String(node.attrs.entryImageId))
              }
            })

            const pending = pendingRef.current
            for (const id of oldIds) {
              if (!newIds.has(id)) pending.add(id)
            }
            for (const id of newIds) {
              pending.delete(id)
            }
            return null
          },
        }),
      ]
    },
  })
}
