// Utility functions for HeartMatch

const utils = (() => {
  // Show notification
  const showNotification = (message, type = "info") => {
    console.log(`Notification (${type}): ${message}`)

    // Get or create notifications container
    let notificationsContainer = document.getElementById("notifications-container")
    if (!notificationsContainer) {
      notificationsContainer = document.createElement("div")
      notificationsContainer.id = "notifications-container"
      document.body.appendChild(notificationsContainer)
    }

    // Create notification element
    const notification = document.createElement("div")
    notification.className = `notification ${type}`

    // Get icon based on type
    let icon
    switch (type) {
      case "success":
        icon = "fa-check-circle"
        break
      case "error":
        icon = "fa-exclamation-circle"
        break
      case "warning":
        icon = "fa-exclamation-triangle"
        break
      default:
        icon = "fa-info-circle"
    }

    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${icon}"></i>
        <p>${message}</p>
      </div>
      <button class="notification-close">
        <i class="fas fa-times"></i>
      </button>
    `

    // Add to container
    notificationsContainer.appendChild(notification)

    // Add event listener to close button
    const closeBtn = notification.querySelector(".notification-close")
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        notification.classList.add("fade-out")
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 300)
      })
    }

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add("fade-out")
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification)
          }
        }, 300)
      }
    }, 5000)
  }

  // Format date
  const formatDate = (date) => {
    if (!date) return ""

    if (typeof date === "string") {
      date = new Date(date)
    } else if (date.toDate && typeof date.toDate === "function") {
      date = date.toDate()
    }

    return date.toLocaleDateString()
  }

  // Format time
  const formatTime = (date) => {
    if (!date) return ""

    if (typeof date === "string") {
      date = new Date(date)
    } else if (date.toDate && typeof date.toDate === "function") {
      date = date.toDate()
    }

    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  // Validate email
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(String(email).toLowerCase())
  }

  // Validate password
  const validatePassword = (password) => {
    return password.length >= 6
  }

  // Expose module
  window.utils = {
    showNotification,
    formatDate,
    formatTime,
    validateEmail,
    validatePassword,
  }

  return {
    showNotification,
    formatDate,
    formatTime,
    validateEmail,
    validatePassword,
  }
})()

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Utils module loaded")
})
