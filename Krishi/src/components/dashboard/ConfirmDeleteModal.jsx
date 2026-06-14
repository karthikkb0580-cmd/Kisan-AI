import { useEffect } from 'react'
import { AlertTriangle, X, Trash2 } from 'lucide-react'
import { useFarmvestStore } from '../../store/useFarmvestStore'
import { translations } from '../../translations'

/**
 * ConfirmDeleteModal — A professional glassmorphism confirmation dialog
 * for destructive / irreversible delete actions.
 *
 * Props:
 *  isOpen      {boolean}   — controls visibility
 *  onConfirm   {function}  — called when "Yes, Delete" is clicked
 *  onCancel    {function}  — called when "Cancel" or overlay is clicked
 *  itemName    {string}    — the name/label of the entity being deleted
 *  itemType    {string}    — friendly type label e.g. "crop", "record", "profile"
 */
export default function ConfirmDeleteModal({
  isOpen,
  onConfirm,
  onCancel,
  itemName = '',
  itemType = 'item',
}) {
  const { language } = useFarmvestStore()

  const t = (key, fallback) =>
    translations[language]?.[key] || translations['en']?.[key] || fallback || key

  // Prevent background scroll while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="cdm-overlay"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cdm-title"
    >
      <div
        className="cdm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button className="cdm-close-btn" onClick={onCancel} aria-label="Close">
          <X size={18} />
        </button>

        {/* Warning icon */}
        <div className="cdm-icon-wrap">
          <div className="cdm-icon-ring">
            <AlertTriangle size={32} className="cdm-icon" />
          </div>
        </div>

        {/* Title */}
        <h2 className="cdm-title" id="cdm-title">
          {t('confirmDelete', 'Confirm Deletion')}
        </h2>

        {/* Message */}
        <p className="cdm-message">
          {t('confirmDeleteMsg', 'This action is permanent and cannot be undone. Are you sure you want to delete')}{' '}
          {itemName && (
            <strong className="cdm-item-name">&ldquo;{itemName}&rdquo;</strong>
          )}
          {!itemName && (
            <span>{t('this', 'this')} {itemType}</span>
          )}
          ?
        </p>

        {/* Warning badge */}
        <div className="cdm-warning-badge">
          <AlertTriangle size={14} />
          <span>This cannot be reversed</span>
        </div>

        {/* Action buttons */}
        <div className="cdm-actions">
          <button
            className="cdm-btn cdm-btn-cancel"
            onClick={onCancel}
            id="cdm-btn-cancel"
          >
            {t('cancelDelete', 'Cancel')}
          </button>
          <button
            className="cdm-btn cdm-btn-delete"
            onClick={onConfirm}
            id="cdm-btn-confirm"
          >
            <Trash2 size={16} />
            {t('proceedDelete', 'Yes, Delete')}
          </button>
        </div>
      </div>
    </div>
  )
}
