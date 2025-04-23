const settingsModule = (() => {
  // Firebase services
  let firebase, auth, db

  // DOM elements
  const settingsSection = document.getElementById("settings-section")
  const preferencesForm = document.getElementById("preferences-form")
  const savePreferencesBtn = document.getElementById("save-preferences-btn")
  const notificationToggle = document.getElementById("notification-toggle")
  const deleteAccountBtn = document.getElementById("delete-account-btn")

  // State
  let currentUser = null

  // Initialize settings module
  const init = () => {
    console.log("Initializing settings module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
    } else {
      console.error("Firebase not initialized in settings module")
      return
    }

    bindEvents()
    loadSettings()

    console.log("Settings module initialized")
  }

  // Load user settings
  const loadSettings = async () => {
    try {
      currentUser = auth.currentUser
      if (!currentUser) return

      // Get user data
      const userDoc = await db.collection("users").doc(currentUser.uid).get()
      const userData = userDoc.data()

      // Populate form with user preferences
      populatePreferencesForm(userData.preferences || {})

      // Set notification toggle
      if (notificationToggle) {
        notificationToggle.checked = userData.notificationsEnabled !== false
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      if (window.utils) {
        window.utils.showNotification("Error loading settings. Please try again.", "error")
      }
    }
  }

  // Populate preferences form
  const populatePreferencesForm = (preferences) => {
    if (!preferencesForm) return

    // Gender preference
    const genderSelect = preferencesForm.querySelector("#gender-preference")
    if (genderSelect) {
      genderSelect.value = preferences.interestedIn || "all"
    }

    // Age range
    const minAgeInput = preferencesForm.querySelector("#min-age")
    const maxAgeInput = preferencesForm.querySelector("#max-age")

    if (minAgeInput) {
      minAgeInput.value = preferences.ageRange?.min || 18
    }

    if (maxAgeInput) {
      maxAgeInput.value = preferences.ageRange?.max || 99
    }

    // Distance
    const maxDistanceInput = preferencesForm.querySelector("#max-distance")
    if (maxDistanceInput) {
      maxDistanceInput.value = preferences.maxDistance || 50
    }
  }

  // Save preferences
  const savePreferences = async () => {
    try {
      if (!preferencesForm) return

      // Get form values
      const genderSelect = preferencesForm.querySelector("#gender-preference")
      const minAgeInput = preferencesForm.querySelector("#min-age")
      const maxAgeInput = preferencesForm.querySelector("#max-age")
      const maxDistanceInput = preferencesForm.querySelector("#max-distance")

      const interestedIn = genderSelect ? genderSelect.value : "all"
      const minAge = minAgeInput ? Number.parseInt(minAgeInput.value) : 18
      const maxAge = maxAgeInput ? Number.parseInt(maxAgeInput.value) : 99
      const maxDistance = maxDistanceInput ? Number.parseInt(maxDistanceInput.value) : 50

      // Validate age range
      if (minAge >= maxAge) {
        if (window.utils) {
          window.utils.showNotification("Minimum age must be less than maximum age.", "error")
        }
        return
      }

      // Get notification setting
      const notificationsEnabled = notificationToggle ? notificationToggle.checked : true

      // Update user preferences in Firestore
      await db
        .collection("users")
        .doc(currentUser.uid)
        .update({
          preferences: {
            interestedIn,
            ageRange: {
              min: minAge,
              max: maxAge,
            },
            maxDistance,
          },
          notificationsEnabled,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        })

      if (window.utils) {
        window.utils.showNotification("Preferences saved successfully!", "success")
      }
    } catch (error) {
      console.error("Error saving preferences:", error)
      if (window.utils) {
        window.utils.showNotification("Error saving preferences. Please try again.", "error")
      }
    }
  }

  // Delete account
  const deleteAccount = async () => {
    try {
      // Show confirmation dialog
      const confirmed = confirm("Are you sure you want to delete your account? This action cannot be undone.")

      if (!confirmed) return

      // Delete user data from Firestore
      await db.collection("users").doc(currentUser.uid).delete()

      // Delete user authentication
      await currentUser.delete()

      // Redirect to landing page
      window.location.reload()
    } catch (error) {
      console.error("Error deleting account:", error)
      if (window.utils) {
        window.utils.showNotification("Error deleting account. Please try again.", "error")
      }

      // If error is due to recent login requirement
      if (error.code === "auth/requires-recent-login") {
        if (window.utils) {
          window.utils.showNotification("Please log out and log back in to delete your account.", "info")
        }
        // authModule is not defined in this scope. Assuming it's a global object.
        // If authModule is not a global object, you'll need to import or define it here.
        if (window.authModule && window.authModule.logout) {
          window.authModule.logout()
        } else {
          console.warn("authModule or authModule.logout is not defined. Logout functionality may not work.")
        }
      }
    }
  }

  // Bind events
  const bindEvents = () => {
    if (savePreferencesBtn) {
      savePreferencesBtn.addEventListener("click", savePreferences)
    }

    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener("click", deleteAccount)
    }
  }

  // Expose module
  window.settingsModule = {
    init,
    loadSettings,
    savePreferences,
    deleteAccount,
  }

  return {
    init,
    loadSettings,
    savePreferences,
    deleteAccount,
  }
})()

// Initialize on load if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    console.log("Auto-initializing settings module")
    setTimeout(() => {
      if (window.settingsModule) {
        settingsModule.init()
      }
    }, 500)
  }
})
