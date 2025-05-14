import './header.css'

export const Header = () => {

  const handleMinimize = () => {
    window.electron?.windowControls?.minimize()
  }

  const handleMaximize = () => {
    window.electron?.windowControls?.maximize()
  }

  const handleClose = () => {
    window.electron?.windowControls?.close()
  }

  return (
    <>
      <h3>Lemma Markdown</h3>
      <div className="header-controls">
        <div className="window-controls">
          <button onClick={handleMinimize} title="Minimize">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect y="5.5" width="12" height="1" fill="currentColor" />
            </svg>
          </button>
          <button onClick={handleMaximize} title="Maximize">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <rect x="1" y="1" width="10" height="10" stroke="currentColor" fill="none" strokeWidth="1" />
            </svg>
          </button>
          <button onClick={handleClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M1,1 L11,11 M1,11 L11,1" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}