// Wait for DOM to be fully loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded in main.js")

  // Initialize Firebase
  const firebaseConfig = {
    apiKey: "AIzaSyAsc5FpnqdJdUXql2jAIPf7-VSLIv4TIv0",
    authDomain: "datingapp-482ac.firebaseapp.com",
    projectId: "datingapp-482ac",
    storageBucket: "datingapp-482ac.firebasestorage.app",
    messagingSenderId: "672058081482",
    appId: "1:672058081482:web:d61e90a5f397eb46e4b433",
    measurementId: "G-F300RLDGVF",
  }

  try {
    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig)
    }

    // Make Firebase services available globally
    window.firebase = firebase
    window.auth = firebase.auth()
    window.db = firebase.firestore()
    window.storage = firebase.storage ? firebase.storage() : null

    console.log("Firebase initialized successfully")

    // Enable persistence to work offline
    firebase
      .firestore()
      .enablePersistence()
      .then(() => {
        console.log("Firestore persistence enabled")
      })
      .catch((err) => {
        console.error("Error enabling Firestore persistence:", err)
      })
  } catch (error) {
    console.error("Error initializing Firebase:", error)
  }

  // Initialize utils if not already initialized
  if (!window.utils) {
    window.utils = {
      showNotification: (message, type) => {
        console.log(`${type}: ${message}`)
        alert(`${message}`)
      },
    }
  }

  // Check which page we're on
  const currentPage = getCurrentPage()
  console.log("Current page:", currentPage)

  // Initialize modules based on current page
  if (currentPage === "index") {
    // Landing page
    console.log("Initializing landing page from main.js")
    if (window.landingModule && typeof window.landingModule.init === "function") {
      window.landingModule.init()
    } else {
      console.error("Landing module not found or init method not available")
    }

    // Check for auto-login on landing page
    checkForAutoLogin()
  } else if (currentPage === "auth") {
    // Auth page
    console.log("Initializing auth page")
    if (window.authModule && typeof window.authModule.init === "function") {
      window.authModule.init()
    } else {
      console.error("Auth module not found or init method not available")
    }
  } else if (currentPage === "onboarding") {
    // Onboarding page
    console.log("Initializing onboarding page")
    if (window.onboardingModule && typeof window.onboardingModule.init === "function") {
      window.onboardingModule.init()
    } else {
      console.error("Onboarding module not found or init method not available")
    }
  } else if (currentPage === "dashboard") {
    // Dashboard page
    console.log("Initializing dashboard page from main.js")
    initDashboard()
  }

  // Setup auth state listener
  setupAuthStateListener()
})

// Check for auto-login
function checkForAutoLogin() {
  console.log("Checking for auto-login from main.js")

  // If we're already on a page that requires auth, don't auto-login
  if (window.location.pathname.includes("dashboard.html") || window.location.pathname.includes("onboarding.html")) {
    console.log("Already on authenticated page, skipping auto-login check")
    return
  }

  // Check if user is already logged in via Firebase
  const currentUser = firebase.auth().currentUser
  if (currentUser) {
    console.log("User already logged in via Firebase, redirecting to dashboard")
    window.location.href = "dashboard.html"
    return
  }

  // If we have the auth module, use it to check for auto-login
  if (window.authModule && typeof window.authModule.checkForAutoLogin === "function") {
    window.authModule.checkForAutoLogin()
  } else {
    console.log("Auth module not available for auto-login check")

    // Fallback: Check for saved auth data directly
    try {
      const savedAuth = localStorage.getItem("heartMatchAuth")
      if (savedAuth) {
        const authData = JSON.parse(savedAuth)

        // Check if the saved data is expired (30 days)
        const now = Date.now()
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
        if (authData.timestamp && now - authData.timestamp <= thirtyDaysInMs) {
          console.log("Found valid saved auth data, attempting auto-login")

          if (authData.email && authData.password) {
            firebase
              .auth()
              .signInWithEmailAndPassword(authData.email, authData.password)
              .then((userCredential) => {
                console.log("Auto-login successful with email/password")
                window.location.href = "dashboard.html"
              })
              .catch((error) => {
                console.error("Auto-login with email/password failed:", error)
                // Clear invalid saved auth data
                localStorage.removeItem("heartMatchAuth")
              })
          }
        } else {
          console.log("Saved auth data expired, clearing")
          localStorage.removeItem("heartMatchAuth")
        }
      } else {
        console.log("No saved auth data found")
      }
    } catch (error) {
      console.error("Error checking for saved auth data:", error)
    }
  }
}

// Get current page
function getCurrentPage() {
  const path = window.location.pathname
  console.log("Current path:", path)

  if (path.includes("auth.html")) {
    return "auth"
  } else if (path.includes("onboarding.html")) {
    return "onboarding"
  } else if (path.includes("dashboard.html")) {
    return "dashboard"
  } else if (path.endsWith("/") || path.includes("index.html") || path.endsWith("index") || path === "") {
    return "index"
  } else {
    console.log("Defaulting to index page")
    return "index"
  }
}

// Initialize dashboard modules
function initDashboard() {
  console.log("Initializing dashboard and sub-modules from main.js")

  // Initialize dashboard module first
  if (window.dashboardModule && typeof window.dashboardModule.init === "function") {
    console.log("Initializing dashboard module from window object")
    window.dashboardModule.init()
  } else {
    console.error("Dashboard module not found or init method not available")

    // Create a fallback dashboard module with basic functionality
    window.dashboardModule = {
      init: function () {
        console.log("Using fallback dashboard module initialization")
        this.bindNavEvents()
      },
      showSection: (sectionId) => {
        console.log(`Showing section: ${sectionId}`)

        // Update active nav items
        document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((item) => {
          if (item.getAttribute("data-section") === sectionId) {
            item.classList.add("active")
          } else {
            item.classList.remove("active")
          }
        })

        // Show/hide sections
        document.querySelectorAll(".content-section").forEach((section) => {
          if (section.id === `${sectionId}-section`) {
            section.classList.remove("hidden")
          } else {
            section.classList.add("hidden")
          }
        })

        // Initialize specific section if needed
        if (
          sectionId === "discover" &&
          window.discoverModule &&
          typeof window.discoverModule.loadProfiles === "function"
        ) {
          window.discoverModule.loadProfiles()
        } else if (
          sectionId === "matches" &&
          window.matchesModule &&
          typeof window.matchesModule.loadMatches === "function"
        ) {
          window.matchesModule.loadMatches()
        } else if (
          sectionId === "chat" &&
          window.chatModule &&
          typeof window.chatModule.loadConversations === "function"
        ) {
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
      },
      bindNavEvents: function () {
        // Bind navigation events
        document.querySelectorAll(".nav-item, .mobile-nav-item").forEach((item) => {
          const section = item.getAttribute("data-section")
          item.addEventListener("click", () => {
            this.showSection(section)
          })
        })

        // Bind logout event
        const logoutBtn = document.getElementById("logout-btn")
        if (logoutBtn) {
          logoutBtn.addEventListener("click", () => {
            if (window.firebase && window.firebase.auth()) {
              window.firebase
                .auth()
                .signOut()
                .then(() => {
                  // Clear saved auth data on logout
                  localStorage.removeItem("heartMatchAuth")
                  window.location.href = "index.html"
                })
                .catch((error) => {
                  console.error("Logout error:", error)
                  alert("Error logging out. Please try again.")
                })
            }
          })
        }
      },
      logout: () => {
        if (window.firebase && window.firebase.auth()) {
          window.firebase
            .auth()
            .signOut()
            .then(() => {
              // Clear saved auth data on logout
              localStorage.removeItem("heartMatchAuth")
              window.location.href = "index.html"
            })
            .catch((error) => {
              console.error("Logout error:", error)
              alert("Error logging out. Please try again.")
            })
        }
      },
    }

    // Initialize the fallback module
    window.dashboardModule.init()
  }

  // Initialize sub-modules
  setTimeout(() => {
    if (window.discoverModule && typeof window.discoverModule.init === "function") {
      console.log("Initializing discover module")
      window.discoverModule.init()
    }

    if (window.matchesModule && typeof window.matchesModule.init === "function") {
      console.log("Initializing matches module")
      window.matchesModule.init()
    }

    if (window.chatModule && typeof window.chatModule.init === "function") {
      console.log("Initializing chat module")
      window.chatModule.init()
    }

    if (window.profileModule && typeof window.profileModule.init === "function") {
      console.log("Initializing profile module")
      window.profileModule.init()
    }

    if (window.settingsModule && typeof window.settingsModule.init === "function") {
      console.log("Initializing settings module")
      window.settingsModule.init()
    }
  }, 500)
}

// Setup auth state listener
function setupAuthStateListener() {
  if (window.firebase && window.firebase.auth()) {
    // Add a flag to prevent multiple redirects
    let redirectInProgress = false

    window.firebase.auth().onAuthStateChanged(async (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "User logged out")

      // If a redirect is already in progress, don't process this auth change
      if (redirectInProgress) {
        console.log("Redirect already in progress, ignoring auth change")
        return
      }

      const currentPage = getCurrentPage()
      console.log("Current page during auth check:", currentPage)

      // Special handling for index and auth pages - don't redirect
      if (currentPage === "index" || currentPage === "auth") {
        console.log(`On ${currentPage} page, no redirection needed`)
        return
      }

      if (user) {
        // User is signed in
        try {
          // Only check profile if on onboarding or dashboard pages
          if (currentPage === "onboarding" || currentPage === "dashboard") {
            // Check if user has a profile
            const userDoc = await window.firebase.firestore().collection("users").doc(user.uid).get()

            if (userDoc.exists) {
              // User has a profile
              console.log("User has a profile")

              // If on onboarding, redirect to dashboard
              if (currentPage === "onboarding") {
                console.log("Redirecting to dashboard")
                redirectInProgress = true
                window.location.href = "dashboard.html"
              }
            } else {
              // User doesn't have a profile
              console.log("User doesn't have a profile")

              // If on dashboard, redirect to onboarding
              if (currentPage === "dashboard") {
                console.log("Redirecting to onboarding")
                redirectInProgress = true
                window.location.href = "onboarding.html"
              }
            }
          }
        } catch (error) {
          console.error("Error checking user profile:", error)
        }
      } else {
        // User is signed out
        console.log("User is signed out, current page:", currentPage)

        // If on protected pages, redirect to index
        if (currentPage === "dashboard" || currentPage === "onboarding") {
          console.log("Redirecting to index")
          redirectInProgress = true
          window.location.href = "index.html"
        }
      }
    })
  } else {
    console.error("Firebase auth not available for auth state listener")
  }
}
