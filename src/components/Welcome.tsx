export function Welcome() {
  return (
    <div className="welcome" aria-hidden>
      <div className="welcome-hint top">↑ Pick a tool &amp; start drawing</div>
      <div className="welcome-hint left">← Menu: open, save, export, theme</div>
      <div className="welcome-center">
        <div className="logo">🍣 Sashimi</div>
        <p>Your drawings are saved locally in this browser.</p>
        <p>
          To write text, press <kbd>T</kbd> and click, or double-click anywhere.
        </p>
        <p className="muted">All your system fonts · a much bigger color palette · opens .excalidraw files</p>
        <p className="muted small">
          Press <kbd>?</kbd> for shortcuts
        </p>
      </div>
    </div>
  );
}
