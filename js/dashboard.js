// Dashboard Module
const dashboardModule = (() => {
  // Firebase services
  let firebase, auth, db, storage

  // DOM elements
  let dashboardPage
  let navItems
  let mobileNavItems
  let contentSections
  let logoutBtn

  // Initialize dashboard
  const init = () => {
    console.log("Initializing dashboard module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage ? firebase.storage() : null
    } else {
      console.error("Firebase not initialized in dashboard module")
    }

    // Get DOM elements
    dashboardPage = document.getElementById("dashboard-page")
    navItems = document.querySelectorAll(".dashboard-nav .nav-item")
    mobileNavItems = document.querySelectorAll(".mobile-nav-item")
    contentSections = document.querySelectorAll(".content-section")
    logoutBtn = document.getElementById("logout-btn")

    if (!dashboardPage) {
      console.error("Dashboard page element not found")
      return
    }

    bindEvents()

    // Default to discover page
    showSection("discover")

    // Load user info
    loadUserInfo()

    // Make sure the module is available globally
    window.dashboardModule = {
      init,
      show,
      hide,
      showSection,
      logout,
    }

    console.log("Dashboard module initialized")
  }

  // Bind events
  const bindEvents = () => {
    console.log("Binding dashboard events")

    // Bind navigation events for desktop
    if (navItems) {
      navItems.forEach((item) => {
        const section = item.getAttribute("data-section")
        item.addEventListener("click", () => {
          showSection(section)
        })
      })
    }

    // Bind navigation events for mobile
    if (mobileNavItems) {
      mobileNavItems.forEach((item) => {
        const section = item.getAttribute("data-section")
        item.addEventListener("click", () => {
          showSection(section)
        })
      })
    }

    // Bind logout event
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout)
    }

    console.log("Dashboard events bound")
  }

  // Show specific section
  const showSection = (sectionId) => {
    console.log(`Showing section: ${sectionId}`)

    // Update active nav item on desktop
    if (navItems) {
      navItems.forEach((item) => {
        if (item.getAttribute("data-section") === sectionId) {
          item.classList.add("active")
        } else {
          item.classList.remove("active")
        }
      })
    }

    // Update active nav item on mobile
    if (mobileNavItems) {
      mobileNavItems.forEach((item) => {
        if (item.getAttribute("data-section") === sectionId) {
          item.classList.add("active")
        } else {
          item.classList.remove("active")
        }
      })
    }

    // Show selected section, hide others
    if (contentSections) {
      contentSections.forEach((section) => {
        if (section.id === `${sectionId}-section`) {
          section.classList.remove("hidden")
        } else {
          section.classList.add("hidden")
        }
      })
    }

    // Initialize specific section if needed
    if (sectionId === "discover" && window.discoverModule && typeof window.discoverModule.loadProfiles === "function") {
      window.discoverModule.loadProfiles()
    } else if (
      sectionId === "matches" &&
      window.matchesModule &&
      typeof window.matchesModule.loadMatches === "function"
    ) {
      window.matchesModule.loadMatches()
    } else if (sectionId === "chat" && window.chatModule && typeof window.chatModule.loadConversations === "function") {
      window.chatModule.loadConversations()
    } else if (
      sectionId === "profile" &&
      window.profileModule &&
      typeof window.profileModule.loadProfile === "function"
    ) {
      window.profileModule.loadProfile()
    } else if (
      sectionId === "settings" &&
      window.settingsModule &&
      typeof window.settingsModule.loadSettings === "function"
    ) {
      window.settingsModule.loadSettings()
    }
  }

  // Load user info
  const loadUserInfo = async () => {
    try {
      if (!auth || !auth.currentUser) {
        console.error("No user logged in or auth not initialized")
        return
      }

      const user = auth.currentUser
      const userPhotoElement = document.getElementById("user-photo")
      const userNameElement = document.getElementById("user-name")

      if (userNameElement) {
        userNameElement.textContent = user.displayName || "User"
      }

      if (userPhotoElement) {
        if (user.photoURL) {
          userPhotoElement.style.backgroundImage = `url(${user.photoURL})`
        } else if (db) {
          // Try to get photo from Firestore
          const userDoc = await db.collection("users").doc(user.uid).get()

          if (userDoc.exists) {
            const userData = userDoc.data()
            if (userData.photos && userData.photos.length > 0) {
              userPhotoElement.style.backgroundImage = `url(${userData.photos[0]})`
            } else {
              userPhotoElement.style.backgroundImage = `url('images/default-avatar.png')`
            }

            if (userNameElement && !user.displayName) {
              userNameElement.textContent = userData.displayName || userData.name || "User"
            }
          } else {
            userPhotoElement.style.backgroundImage = `url('images/default-avatar.png')`
          }
        }
      }
    } catch (error) {
      console.error("Error loading user info:", error)
    }
  }

  // Logout function
  const logout = () => {
    console.log("Logging out")

    if (!auth) {
      console.error("Auth not initialized")
      window.location.href = "index.html"
      return
    }

    auth
      .signOut()
      .then(() => {
        console.log("User signed out successfully")
        window.location.href = "index.html"
      })
      .catch((error) => {
        console.error("Error signing out:", error)
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("Error signing out. Please try again.", "error")
        }
      })
  }

  // Show dashboard
  const show = () => {
    if (dashboardPage) {
      dashboardPage.classList.remove("hidden")
    }
  }

  // Hide dashboard
  const hide = () => {
    if (dashboardPage) {
      dashboardPage.classList.add("hidden")
    }
  }

  // Expose module
  window.dashboardModule = {
    init,
    show,
    hide,
    showSection,
    logout,
  }

  return {
    init,
    show,
    hide,
    showSection,
    logout,
  }
})()

// Initialize on load if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    console.log("Auto-initializing dashboard module")
    setTimeout(() => {
      if (typeof dashboardModule !== "undefined") {
        dashboardModule.init()
      } else {
        console.error("Dashboard module not defined")
      }
    }, 300)
  }
})
