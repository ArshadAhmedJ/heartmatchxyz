// Settings Module
const settingsModule = (() => {
  // Firebase services
  let firebase, auth, db, storage

  // DOM elements
  let preferencesForm
  let savePreferencesBtn
  let notificationToggle
  let deleteAccountBtn
  let verificationSection

  // Add this helper function at the beginning of the module
  const elementContainsText = (element, text) => {
    return element.textContent.includes(text)
  }

  // Initialize settings module
  const init = () => {
    console.log("Initializing settings module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage ? firebase.storage() : null
    } else {
      console.error("Firebase not initialized in settings module")
      return
    }

    // Get DOM elements
    preferencesForm = document.getElementById("preferences-form")
    savePreferencesBtn = document.getElementById("save-preferences-btn")
    notificationToggle = document.getElementById("notification-toggle")
    deleteAccountBtn = document.getElementById("delete-account-btn")

    // Check if verification section already exists
    const verificationExists = Array.from(document.querySelectorAll(".settings-card .settings-card-header h3")).some(
      (header) => header.textContent.includes("Profile Verification"),
    )

    if (!verificationExists) {
      // Create verification section only if it doesn't exist
      createVerificationSection()
    } else {
      // Just get a reference to the existing section
      verificationSection = document.getElementById("verification-section")
      // Rebind events to ensure they work
      bindVerificationEvents()
      // Check verification status
      checkVerificationStatus()
    }

    // Load user preferences
    loadUserPreferences()

    // Bind events
    bindEvents()

    console.log("Settings module initialized")
  }

  // Create verification section
  const createVerificationSection = () => {
    // Find the settings container
    const settingsContainer = document.querySelector(".settings-container")
    if (!settingsContainer) return

    // Check if verification section already exists
    const verificationExists = Array.from(document.querySelectorAll(".settings-card .settings-card-header h3")).some(
      (header) => elementContainsText(header, "Profile Verification"),
    )
    if (verificationExists) {
      console.log("Verification section already exists, skipping creation")
      return
    }

    // Create verification card
    const verificationCard = document.createElement("div")
    verificationCard.className = "settings-card"
    verificationCard.innerHTML = `
      <div class="settings-card-header">
        <h3>Profile Verification</h3>
      </div>
      <div class="settings-card-body" id="verification-section">
        <p>Verify your profile to let others know you're a real person. Get a verification badge on your profile!</p>
        <div class="verification-status">
          <div id="verification-status-indicator" class="verification-indicator">
            <i class="fas fa-spinner fa-spin"></i>
          </div>
          <div id="verification-status-text">Checking verification status...</div>
        </div>
        <div id="verification-actions" class="verification-actions" style="display: none;">
          <div id="verification-instructions" class="verification-instructions">
            <p>Take a selfie in the pose shown below to verify your identity:</p>
            <div class="verification-pose">
              <img src="images/verification-pose.png" alt="Verification pose" />
              <p>Take a photo with your hand raised like this</p>
            </div>
          </div>
          <div class="verification-upload">
            <input type="file" id="verification-photo" accept="image/*" capture="user" class="verification-input" />
            <label for="verification-photo" class="btn secondary-btn verification-btn">
              <i class="fas fa-camera"></i> Take Verification Photo
            </label>
          </div>
          <div id="verification-preview" class="verification-preview" style="display: none;">
            <img id="verification-image" src="/placeholder.svg" alt="Verification photo preview" />
            <div class="verification-preview-actions">
              <button id="submit-verification" class="btn primary-btn">Submit for Verification</button>
              <button id="retake-verification" class="btn secondary-btn">Retake Photo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `

    // Insert before the last card (account settings)
    const lastCard = settingsContainer.querySelector(".settings-card:last-child")
    settingsContainer.insertBefore(verificationCard, lastCard)

    // Store reference to verification section
    verificationSection = document.getElementById("verification-section")

    // Add event listeners for verification
    bindVerificationEvents()

    // Check verification status
    checkVerificationStatus()
  }

  // Check verification status
  const checkVerificationStatus = async () => {
    try {
      const user = auth.currentUser
      if (!user) return

      const statusIndicator = document.getElementById("verification-status-indicator")
      const statusText = document.getElementById("verification-status-text")
      const verificationActions = document.getElementById("verification-actions")

      // Get user document
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (!userDoc.exists) return

      const userData = userDoc.data()

      // Update UI based on verification status
      if (userData.verification) {
        statusIndicator.innerHTML = '<i class="fas fa-check-circle"></i>'
        statusIndicator.className = "verification-indicator verified"

        if (userData.verification.status === "verified") {
          statusText.textContent = "Your profile is verified! ✓"
          verificationActions.style.display = "none"
        } else if (userData.verification.status === "pending") {
          statusText.textContent = "Verification pending review. We'll notify you when it's approved."
          verificationActions.style.display = "none"
        } else if (userData.verification.status === "rejected") {
          statusText.textContent = "Verification rejected. Please try again with a clearer photo."
          verificationActions.style.display = "block"
        }
      } else {
        statusIndicator.innerHTML = '<i class="fas fa-times-circle"></i>'
        statusIndicator.className = "verification-indicator unverified"
        statusText.textContent = "Your profile is not verified"
        verificationActions.style.display = "block"
      }
    } catch (error) {
      console.error("Error checking verification status:", error)
    }
  }

  // Bind verification events
  const bindVerificationEvents = () => {
    // Photo upload
    const photoInput = document.getElementById("verification-photo")
    if (photoInput) {
      photoInput.addEventListener("change", handleVerificationPhoto)
    }

    // Submit verification
    const submitBtn = document.getElementById("submit-verification")
    if (submitBtn) {
      submitBtn.addEventListener("click", submitVerification)
    }

    // Retake photo
    const retakeBtn = document.getElementById("retake-verification")
    if (retakeBtn) {
      retakeBtn.addEventListener("click", () => {
        const preview = document.getElementById("verification-preview")
        const actions = document.getElementById("verification-instructions")
        const uploadBtn = document.querySelector(".verification-upload")

        if (preview) preview.style.display = "none"
        if (actions) actions.style.display = "block"
        if (uploadBtn) uploadBtn.style.display = "block"
      })
    }
  }

  // Handle verification photo upload
  const handleVerificationPhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const preview = document.getElementById("verification-preview")
      const image = document.getElementById("verification-image")
      const instructions = document.getElementById("verification-instructions")
      const uploadBtn = document.querySelector(".verification-upload")

      if (image) image.src = event.target.result
      if (preview) preview.style.display = "block"
      if (instructions) instructions.style.display = "none"
      if (uploadBtn) uploadBtn.style.display = "none"
    }
    reader.readAsDataURL(file)
  }

  // Submit verification photo
  const submitVerification = async () => {
    try {
      const user = auth.currentUser
      if (!user) return

      const photoInput = document.getElementById("verification-photo")
      if (!photoInput || !photoInput.files || !photoInput.files[0]) {
        console.error("No verification photo selected")
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("Please select a verification photo", "error")
        }
        return
      }

      // Show loading state
      const submitBtn = document.getElementById("submit-verification")
      if (submitBtn) {
        submitBtn.disabled = true
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...'
      }

      // Upload photo to storage using the verification module
      const file = photoInput.files[0]
      let photoURL

      if (window.verificationModule && window.verificationModule.uploadVerificationPhoto) {
        photoURL = await window.verificationModule.uploadVerificationPhoto(file, user.uid)
      } else {
        // Fallback if verification module is not available
        const storageRef = storage.ref()
        const fileRef = storageRef.child(`verification/${user.uid}/${Date.now()}_verification.jpg`)
        await fileRef.put(file)
        photoURL = await fileRef.getDownloadURL()
      }

      // Update user document with verification request
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          verification: {
            status: "pending",
            photoURL: photoURL,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          },
        })

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Verification photo submitted! We'll review it shortly.", "success")
      }

      // Update UI
      checkVerificationStatus()
    } catch (error) {
      console.error("Error submitting verification:", error)

      // Show error notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error submitting verification. Please try again.", "error")
      }

      // Reset button
      const submitBtn = document.getElementById("submit-verification")
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = "Submit for Verification"
      }
    }
  }

  // Load user preferences
  const loadUserPreferences = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get user document
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (!userDoc.exists) {
        console.error("User document not found")
        return
      }

      const userData = userDoc.data()

      // Set form values
      if (userData.preferences) {
        const genderPreference = document.getElementById("gender-preference")
        const minAge = document.getElementById("min-age")
        const maxAge = document.getElementById("max-age")
        const maxDistance = document.getElementById("max-distance")

        if (genderPreference && userData.preferences.interestedIn) {
          genderPreference.value = userData.preferences.interestedIn
        }

        if (minAge && userData.preferences.ageRange && userData.preferences.ageRange.min) {
          minAge.value = userData.preferences.ageRange.min
        }

        if (maxAge && userData.preferences.ageRange && userData.preferences.ageRange.max) {
          maxAge.value = userData.preferences.ageRange.max
        }

        if (maxDistance && userData.preferences.maxDistance) {
          maxDistance.value = userData.preferences.maxDistance
        }
      }

      // Set notification toggle
      if (notificationToggle && userData.notifications !== undefined) {
        notificationToggle.checked = userData.notifications
      }
    } catch (error) {
      console.error("Error loading user preferences:", error)
    }
  }

  // Save user preferences
  const savePreferences = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get form values
      const genderPreference = document.getElementById("gender-preference").value
      const minAge = Number.parseInt(document.getElementById("min-age").value)
      const maxAge = Number.parseInt(document.getElementById("max-age").value)
      const maxDistance = Number.parseInt(document.getElementById("max-distance").value)

      // Validate values
      if (minAge < 18) {
        console.log("Minimum age must be at least 18")
        return
      }

      if (maxAge < minAge) {
        console.log("Maximum age must be greater than minimum age")
        return
      }

      if (maxDistance < 1) {
        console.log("Maximum distance must be at least 1 km")
        return
      }

      // Update user preferences
      await db
        .collection("users")
        .doc(user.uid)
        .update({
          preferences: {
            interestedIn: genderPreference,
            ageRange: {
              min: minAge,
              max: maxAge,
            },
            maxDistance: maxDistance,
          },
          lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        })

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Preferences saved successfully!", "success")
      }
    } catch (error) {
      console.error("Error saving preferences:", error)

      // Show error notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error saving preferences. Please try again.", "error")
      }
    }
  }

  // Toggle notifications
  const toggleNotifications = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get toggle value
      const notificationsEnabled = notificationToggle.checked

      // Update user preferences
      await db.collection("users").doc(user.uid).update({
        notifications: notificationsEnabled,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification(
          `Notifications ${notificationsEnabled ? "enabled" : "disabled"} successfully!`,
          "success",
        )
      }
    } catch (error) {
      console.error("Error toggling notifications:", error)

      // Show error notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error updating notification settings. Please try again.", "error")
      }

      // Reset toggle to previous state
      if (notificationToggle) {
        notificationToggle.checked = !notificationToggle.checked
      }
    }
  }

  // Delete account
  const deleteAccount = async () => {
    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Show confirmation dialog
      const confirmed = window.confirm("Are you sure you want to delete your account? This action cannot be undone.")

      if (!confirmed) {
        return
      }

      // Delete user document
      await db.collection("users").doc(user.uid).delete()

      // Delete user authentication
      await user.delete()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Account deleted successfully!", "success")
      }

      // Redirect to landing page
      window.location.href = "index.html"
    } catch (error) {
      console.error("Error deleting account:", error)

      // Show error notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification(
          "Error deleting account. You may need to re-authenticate. Please try again.",
          "error",
        )
      }
    }
  }

  // Bind events
  const bindEvents = () => {
    // Save preferences
    if (savePreferencesBtn) {
      savePreferencesBtn.addEventListener("click", savePreferences)
    }

    // Toggle notifications
    if (notificationToggle) {
      notificationToggle.addEventListener("change", toggleNotifications)
    }

    // Delete account
    if (deleteAccountBtn) {
      deleteAccountBtn.addEventListener("click", deleteAccount)
    }
  }

  // Expose module
  window.settingsModule = {
    init,
    loadUserPreferences,
    savePreferences,
    toggleNotifications,
    deleteAccount,
  }

  return {
    init,
    loadUserPreferences,
    savePreferences,
    toggleNotifications,
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
