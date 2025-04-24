// Verification Module
const verificationModule = (() => {
  // Firebase services
  let firebase, auth, db, storage

  // Initialize verification module
  const init = () => {
    console.log("Initializing verification module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage ? firebase.storage() : null
    } else {
      console.error("Firebase not initialized in verification module")
      return
    }

    console.log("Verification module initialized")
  }

  // Check if user is verified
  const isUserVerified = async (userId) => {
    try {
      const userDoc = await db.collection("users").doc(userId).get()
      if (!userDoc.exists) return false

      const userData = userDoc.data()
      return userData.verification && userData.verification.status === "verified"
    } catch (error) {
      console.error("Error checking verification status:", error)
      return false
    }
  }

  // Add verification badge to element
  const addVerificationBadge = (element, isVerified) => {
    if (!element) return

    // Check if badge already exists
    const existingBadge = element.querySelector(".verification-badge")
    if (existingBadge) {
      // Update existing badge
      existingBadge.style.display = isVerified ? "inline-flex" : "none"
      return
    }

    // Create badge if verified
    if (isVerified) {
      const badge = document.createElement("span")
      badge.className = "verification-badge"
      badge.innerHTML = '<i class="fas fa-check-circle"></i>'
      badge.title = "Verified Profile"
      element.appendChild(badge)
    }
  }

  // Update verification badges in discover cards
  const updateDiscoverCardBadges = async () => {
    try {
      const cards = document.querySelectorAll(".profile-card")

      for (const card of cards) {
        const userId = card.getAttribute("data-user-id")
        if (!userId) continue

        const isVerified = await isUserVerified(userId)

        // Add badge to card
        addVerificationBadge(card, isVerified)

        // Add badge to name element
        const nameElement = card.querySelector(".profile-name")
        if (nameElement) {
          addVerificationBadge(nameElement, isVerified)
        }
      }
    } catch (error) {
      console.error("Error updating verification badges:", error)
    }
  }

  // Update verification badges in matches
  const updateMatchBadges = async () => {
    try {
      const matchCards = document.querySelectorAll(".match-card")

      for (const card of matchCards) {
        const userId = card.getAttribute("data-user-id")
        if (!userId) continue

        const isVerified = await isUserVerified(userId)

        // Add badge to name element
        const nameElement = card.querySelector(".match-name")
        if (nameElement) {
          addVerificationBadge(nameElement, isVerified)
        }
      }

      // Also update like cards
      const likeCards = document.querySelectorAll(".like-card")

      for (const card of likeCards) {
        const userId = card.getAttribute("data-user-id")
        if (!userId) continue

        const isVerified = await isUserVerified(userId)

        // Add badge to name element
        const nameElement = card.querySelector(".like-name")
        if (nameElement) {
          addVerificationBadge(nameElement, isVerified)
        }
      }
    } catch (error) {
      console.error("Error updating match verification badges:", error)
    }
  }

  // Expose module
  window.verificationModule = {
    init,
    isUserVerified,
    addVerificationBadge,
    updateDiscoverCardBadges,
    updateMatchBadges,
  }

  return {
    init,
    isUserVerified,
    addVerificationBadge,
    updateDiscoverCardBadges,
    updateMatchBadges,
  }
})()

// Initialize on load if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    console.log("Auto-initializing verification module")
    setTimeout(() => {
      if (window.verificationModule) {
        verificationModule.init()
      }
    }, 500)
  }
})
