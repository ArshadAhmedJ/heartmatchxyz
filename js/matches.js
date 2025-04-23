// Matches Module
const matchesModule = (() => {
  // Firebase services
  let firebase, auth, db, storage

  // DOM elements
  let matchesList
  let noMatchesMessage

  // Initialize matches module
  const init = () => {
    console.log("Initializing matches module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage ? firebase.storage() : null
    } else {
      console.error("Firebase not initialized in matches module")
      return
    }

    // Get DOM elements
    matchesList = document.getElementById("matches-list")
    noMatchesMessage = document.getElementById("no-matches-message")

    if (!matchesList) {
      console.error("Matches list element not found")
      return
    }

    // Add auth state listener to load matches when user is authenticated
    auth.onAuthStateChanged((user) => {
      if (user) {
        loadMatches()
      } else {
        showNoMatchesMessage("Please log in to see your matches")
      }
    })

    console.log("Matches module initialized")
  }

  // Load matches from Firestore
  const loadMatches = async () => {
    console.log("Loading matches")

    try {
      showLoadingState()

      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        showNoMatchesMessage("Please log in to see your matches")
        return
      }

      // First, get the user's likes to find potential matches
      const likesSnapshot = await db.collection("likes").where("userId", "==", user.uid).get()

      if (likesSnapshot.empty) {
        console.log("No likes found")
        showNoMatchesMessage("You haven't liked anyone yet. Start swiping to find matches!")
        return
      }

      // Get the IDs of users this user has liked
      const likedUserIds = likesSnapshot.docs.map((doc) => doc.data().likedUserId)

      // Now get likes where other users have liked this user
      const reverseLikesSnapshot = await db.collection("likes").where("likedUserId", "==", user.uid).get()

      if (reverseLikesSnapshot.empty) {
        console.log("No reverse likes found")
        showNoMatchesMessage("No one has liked you back yet. Keep swiping!")
        return
      }

      // Find mutual likes (matches)
      const mutualLikes = []
      reverseLikesSnapshot.forEach((doc) => {
        const likeData = doc.data()
        if (likedUserIds.includes(likeData.userId)) {
          mutualLikes.push(likeData.userId)
        }
      })

      if (mutualLikes.length === 0) {
        console.log("No mutual likes found")
        showNoMatchesMessage("No mutual matches yet. Keep swiping!")
        return
      }

      // Get user profiles for each match
      const matchPromises = mutualLikes.map(async (otherUserId) => {
        try {
          // Get the other user's profile
          const otherUserDoc = await db.collection("users").doc(otherUserId).get()

          if (!otherUserDoc.exists) {
            console.log(`User ${otherUserId} not found`)
            return null
          }

          const otherUserData = otherUserDoc.data()

          // Create or get match ID
          const userIds = [user.uid, otherUserId].sort()
          const matchId = userIds.join("_")

          // Check if match document exists
          let matchData = null
          try {
            const matchDoc = await db.collection("matches").doc(matchId).get()
            if (matchDoc.exists) {
              matchData = matchDoc.data()
            }
          } catch (error) {
            console.log(`Error getting match document: ${error.message}`)
            // Continue even if match document doesn't exist
          }

          // Get the last message if match document exists
          let lastMessage = null
          if (matchData) {
            try {
              const messagesSnapshot = await db
                .collection("matches")
                .doc(matchId)
                .collection("messages")
                .orderBy("timestamp", "desc")
                .limit(1)
                .get()

              if (!messagesSnapshot.empty) {
                lastMessage = messagesSnapshot.docs[0].data()
              }
            } catch (error) {
              console.log(`Error getting messages: ${error.message}`)
              // Continue even if messages can't be retrieved
            }
          }

          return {
            id: matchId,
            matchData,
            otherUser: {
              id: otherUserId,
              ...otherUserData,
            },
            lastMessage,
            hasRose: matchData?.rose && matchData.rose.sent,
          }
        } catch (error) {
          console.error(`Error processing match with user ${otherUserId}:`, error)
          return null
        }
      })

      // Wait for all promises to resolve
      const matches = (await Promise.all(matchPromises)).filter((match) => match !== null)

      if (matches.length === 0) {
        showNoMatchesMessage("No matches found. Keep swiping to find matches!")
        return
      }

      // Sort matches by last message timestamp (if available)
      matches.sort((a, b) => {
        // First check if lastMessage exists and has timestamp
        if (a.lastMessage?.timestamp && b.lastMessage?.timestamp) {
          const timeA = a.lastMessage.timestamp.toMillis
            ? a.lastMessage.timestamp.toMillis()
            : new Date(a.lastMessage.timestamp).getTime()
          const timeB = b.lastMessage.timestamp.toMillis
            ? b.lastMessage.timestamp.toMillis()
            : new Date(b.lastMessage.timestamp).getTime()
          return timeB - timeA
        }

        // Then check if matchData has lastMessageTimestamp
        if (a.matchData?.lastMessageTimestamp && b.matchData?.lastMessageTimestamp) {
          const timeA = a.matchData.lastMessageTimestamp.toMillis
            ? a.matchData.lastMessageTimestamp.toMillis()
            : new Date(a.matchData.lastMessageTimestamp).getTime()
          const timeB = b.matchData.lastMessageTimestamp.toMillis
            ? b.matchData.lastMessageTimestamp.toMillis()
            : new Date(b.matchData.lastMessageTimestamp).getTime()
          return timeB - timeA
        }

        // Default to sorting by user ID if no timestamps available
        return a.otherUser.id.localeCompare(b.otherUser.id)
      })

      // Render matches
      renderMatches(matches)
    } catch (error) {
      console.error("Error loading matches:", error)
      showNoMatchesMessage("Error loading matches. Please try again.")
    }
  }

  // Show loading state
  const showLoadingState = () => {
    if (!matchesList) return

    matchesList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading matches...</p>
      </div>
    `

    if (noMatchesMessage) {
      noMatchesMessage.classList.add("hidden")
    }
  }

  // Show no matches message
  const showNoMatchesMessage = (message) => {
    console.log("Showing no matches message:", message)

    if (!matchesList || !noMatchesMessage) {
      console.error("Matches list or no matches message element not found")
      return
    }

    matchesList.innerHTML = ""

    const messageElement = noMatchesMessage.querySelector("p")
    if (messageElement) {
      messageElement.textContent = message
    }

    noMatchesMessage.classList.remove("hidden")
  }

  // Render matches
  const renderMatches = (matches) => {
    console.log("Rendering matches:", matches.length)

    if (!matchesList) {
      console.error("Matches list element not found")
      return
    }

    matchesList.innerHTML = ""

    if (noMatchesMessage) {
      noMatchesMessage.classList.add("hidden")
    }

    matches.forEach((match) => {
      const { id, otherUser, lastMessage, hasRose } = match

      // Get user photo with proper error handling
      const userPhoto =
        otherUser.photos && otherUser.photos.length > 0 ? otherUser.photos[0] : "images/default-avatar.png"

      // Create match card
      const matchCard = document.createElement("div")
      matchCard.className = "match-card"
      matchCard.dataset.matchId = id
      matchCard.dataset.userId = otherUser.id

      // Sanitize user data to prevent XSS
      const displayName = document.createTextNode(otherUser.displayName || otherUser.name || "Anonymous").textContent
      const messageText = lastMessage
        ? document.createTextNode(lastMessage.text.substring(0, 50) + (lastMessage.text.length > 50 ? "..." : ""))
            .textContent
        : "Start a conversation!"

      matchCard.innerHTML = `
        <div class="match-photo" style="background-image: url('${userPhoto}')">
          ${hasRose ? '<div class="match-rose-indicator"><i class="fas fa-rose"></i></div>' : ""}
        </div>
        <div class="match-info">
          <h3>${displayName}</h3>
          <p>${messageText}</p>
        </div>
        <div class="match-actions">
          <button class="btn primary-btn message-btn" data-user-id="${otherUser.id}" data-match-id="${id}">
            <i class="fas fa-comment"></i> Message
          </button>
          <button class="btn secondary-btn view-profile-btn" data-user-id="${otherUser.id}">
            <i class="fas fa-user"></i> View Profile
          </button>
        </div>
      `

      // Add event listeners using event delegation
      matchCard.addEventListener("click", (e) => {
        if (e.target.closest(".message-btn")) {
          const userId = e.target.closest(".message-btn").getAttribute("data-user-id")
          const matchId = e.target.closest(".message-btn").getAttribute("data-match-id")
          openChat(userId, matchId)
        } else if (e.target.closest(".view-profile-btn")) {
          const userId = e.target.closest(".view-profile-btn").getAttribute("data-user-id")
          viewProfile(userId)
        }
      })

      matchesList.appendChild(matchCard)
    })
  }

  // Open chat with user
  const openChat = (userId, matchId) => {
    console.log("Opening chat with user:", userId, "Match ID:", matchId)

    // Ensure match document exists before opening chat
    ensureMatchExists(userId, matchId)
      .then((validMatchId) => {
        // Switch to chat section
        if (window.dashboardModule && typeof window.dashboardModule.showSection === "function") {
          window.dashboardModule.showSection("chat")

          // Open conversation with user
          if (window.chatModule && typeof window.chatModule.openConversation === "function") {
            window.chatModule.openConversation(userId, validMatchId)
          }
        }
      })
      .catch((error) => {
        console.error("Error ensuring match exists:", error)
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("Error opening chat. Please try again.", "error")
        }
      })
  }

  // Ensure match document exists
  const ensureMatchExists = async (otherUserId, matchId) => {
    const user = auth.currentUser
    if (!user) {
      throw new Error("No user logged in")
    }

    // If matchId is provided, check if it exists
    if (matchId) {
      try {
        const matchDoc = await db.collection("matches").doc(matchId).get()
        if (matchDoc.exists) {
          return matchId
        }
      } catch (error) {
        console.log("Error checking match document:", error)
        // Continue to create a new match
      }
    }

    // Create a new match document
    const userIds = [user.uid, otherUserId].sort()
    const newMatchId = userIds.join("_")

    try {
      await db
        .collection("matches")
        .doc(newMatchId)
        .set(
          {
            users: userIds,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unreadCount: {
              [user.uid]: 0,
              [otherUserId]: 0,
            },
            confirmed: true,
          },
          { merge: true },
        )

      return newMatchId
    } catch (error) {
      console.error("Error creating match document:", error)
      throw error
    }
  }

  // View user profile
  const viewProfile = (userId) => {
    console.log("Viewing profile:", userId)

    // Switch to profile section
    if (window.dashboardModule && typeof window.dashboardModule.showSection === "function") {
      window.dashboardModule.showSection("profile")

      // View user profile
      if (window.profileModule && typeof window.profileModule.viewProfile === "function") {
        window.profileModule.viewProfile(userId)
      }
    }
  }

  // Public methods
  const publicAPI = {
    init,
    loadMatches,
    openChat,
    viewProfile,
    refreshMatches: () => loadMatches(), // Add method to manually refresh matches
  }

  // Expose module
  window.matchesModule = publicAPI

  return publicAPI
})()

// Initialize on load if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    console.log("Auto-initializing matches module")
    // Use a shorter timeout for faster loading
    setTimeout(() => {
      if (window.matchesModule) {
        matchesModule.init()
      }
    }, 300)
  }
})
