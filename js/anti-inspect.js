/**
 * Anti-Inspection Script
 *
 * IMPORTANT: These techniques only discourage casual users from inspecting your page.
 * They cannot prevent determined users or developers from viewing your source code.
 * Never rely on client-side protection for sensitive information or logic.
 */

// Function to initialize anti-inspection measures
function initAntiInspection() {
  // 1. Disable right-click context menu
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault()
    return false
  })

  // 2. Disable keyboard shortcuts for DevTools
  document.addEventListener("keydown", (event) => {
    // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
    if (
      event.key === "F12" ||
      (event.ctrlKey && event.shiftKey && (event.key === "I" || event.key === "J" || event.key === "C"))
    ) {
      event.preventDefault()
      return false
    }

    // Prevent Ctrl+U (view source)
    if (event.ctrlKey && event.key === "u") {
      event.preventDefault()
      return false
    }
  })

  // 3. Detect DevTools opening via window size changes
  const threshold = 160
  const devToolsDetection = () => {
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold

    if (widthThreshold || heightThreshold) {
      document.body.innerHTML = '<div style="text-align: center; padding: 50px;">This page is protected</div>'
    }
  }

  window.addEventListener("resize", devToolsDetection)
  setInterval(devToolsDetection, 1000)

  // 4. Clear the console and show warning
  const consoleWarning = () => {
    console.clear()
    console.log("%cStop!", "color: red; font-size: 30px; font-weight: bold;")
    console.log("%cThis is a browser feature intended for developers.", "font-size: 16px;")
  }

  setInterval(consoleWarning, 2000)

  // 5. Disable selecting text
  document.addEventListener("selectstart", (event) => {
    event.preventDefault()
    return false
  })
}

// Initialize when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", initAntiInspection)
