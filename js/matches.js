// Matches Module
const matchesModule = (() => {
  // Firebase services
  let firebase, auth, db, storage

  // DOM elements
  let matchesList
  let noMatchesMessage
  let likesSection
  let likesList
  let noLikesMessage
  let matchesTab
  let likesTab
  let matchesContent
  let activeTab = "matches"

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
    likesSection = document.getElementById("likes-section")
    likesList = document.getElementById("likes-list")
    noLikesMessage = document.getElementById("no-likes-message")
    matchesTab = document.getElementById("matches-tab")
    likesTab = document.getElementById("likes-tab")
    matchesContent = document.getElementById("matches-content")

    if (!matchesList) {
      console.error("Matches list element not found")
      return
    }

    // Add event listeners to tabs
    if (matchesTab && likesTab) {
      matchesTab.addEventListener("click", () => {
        showTab("matches")
      })

      likesTab.addEventListener("click", () => {
        showTab("likes")
      })
    }

    // Add auth state listener to load matches when user is authenticated
    auth.onAuthStateChanged((user) => {
      if (user) {
        loadMatches()
        loadLikes()
      } else {
        showNoMatchesMessage("Please log in to see your matches")
        showNoLikesMessage("Please log in to see your likes")
      }
    })

    console.log("Matches module initialized")
  }

  // Show tab
  const showTab = (tabName) => {
    console.log("Showing tab:", tabName)
    activeTab = tabName

    if (tabName === "matches") {
      // Show matches, hide likes
      if (matchesTab) matchesTab.classList.add("active")
      if (likesTab) likesTab.classList.remove("active")

      if (matchesContent) matchesContent.classList.remove("hidden")
      if (likesSection) likesSection.classList.add("hidden")
    } else {
      // Show likes, hide matches
      if (matchesTab) matchesTab.classList.remove("active")
      if (likesTab) likesTab.classList.add("active")

      if (matchesContent) matchesContent.classList.add("hidden")
      if (likesSection) likesSection.classList.remove("hidden")
    }
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

  // Load likes from Firestore
  const loadLikes = async () => {
    console.log("Loading likes")

    try {
      showLikesLoadingState()

      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        showNoLikesMessage("Please log in to see your likes")
        return
      }

      // Get likes where other users have liked this user
      const likesSnapshot = await db.collection("likes").where("likedUserId", "==", user.uid).get()

      if (likesSnapshot.empty) {
        console.log("No likes found")
        showNoLikesMessage("No one has liked you yet. Keep improving your profile!")
        return
      }

      // Get user profiles for each like
      const likePromises = likesSnapshot.docs.map(async (doc) => {
        try {
          const likeData = doc.data()
          const otherUserId = likeData.userId

          // Get the other user's profile
          const otherUserDoc = await db.collection("users").doc(otherUserId).get()

          if (!otherUserDoc.exists) {
            console.log(`User ${otherUserId} not found`)
            return null
          }

          const otherUserData = otherUserDoc.data()

          // Check if this user has sent a rose
          let hasRose = false

          // Create match ID to check for roses
          const userIds = [user.uid, otherUserId].sort()
          const matchId = userIds.join("_")

          try {
            const matchDoc = await db.collection("matches").doc(matchId).get()
            if (matchDoc.exists) {
              const matchData = matchDoc.data()
              hasRose = matchData?.rose && matchData.rose.sent && matchData.rose.senderId === otherUserId
            }
          } catch (error) {
            console.log(`Error checking for rose: ${error.message}`)
          }

          // Check if this is a mutual match (user has also liked them back)
          let isMutualMatch = false
          try {
            const userLikeDoc = await db
              .collection("likes")
              .where("userId", "==", user.uid)
              .where("likedUserId", "==", otherUserId)
              .limit(1)
              .get()

            isMutualMatch = !userLikeDoc.empty
          } catch (error) {
            console.log(`Error checking for mutual match: ${error.message}`)
          }

          return {
            id: doc.id,
            likeData,
            otherUser: {
              id: otherUserId,
              ...otherUserData,
            },
            hasRose,
            isMutualMatch,
            timestamp: likeData.timestamp,
          }
        } catch (error) {
          console.error(`Error processing like from user ${doc.data().userId}:`, error)
          return null
        }
      })

      // Wait for all promises to resolve
      const likes = (await Promise.all(likePromises)).filter((like) => like !== null)

      if (likes.length === 0) {
        showNoLikesMessage("No likes found. Keep improving your profile!")
        return
      }

      // Sort likes: roses first, then by timestamp
      likes.sort((a, b) => {
        // First prioritize roses
        if (a.hasRose && !b.hasRose) return -1
        if (!a.hasRose && b.hasRose) return 1

        // Then sort by timestamp (newest first)
        if (a.timestamp && b.timestamp) {
          const timeA = a.timestamp.toMillis ? a.timestamp.toMillis() : new Date(a.timestamp).getTime()
          const timeB = b.timestamp.toMillis ? b.timestamp.toMillis() : new Date(a.timestamp).getTime()
          return timeB - timeA
        }

        return 0
      })

      // Render likes
      renderLikes(likes)
    } catch (error) {
      console.error("Error loading likes:", error)
      showNoLikesMessage("Error loading likes. Please try again.")
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

  // Show likes loading state
  const showLikesLoadingState = () => {
    if (!likesList) return

    likesList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading likes...</p>
      </div>
    `

    if (noLikesMessage) {
      noLikesMessage.classList.add("hidden")
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

  // Show no likes message
  const showNoLikesMessage = (message) => {
    console.log("Showing no likes message:", message)

    if (!likesList || !noLikesMessage) {
      console.error("Likes list or no likes message element not found")
      return
    }

    likesList.innerHTML = ""

    const messageElement = noLikesMessage.querySelector("p")
    if (messageElement) {
      messageElement.textContent = message
    }

    noLikesMessage.classList.remove("hidden")
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

    // Show the correct tab content
    if (activeTab === "matches") {
      showTab("matches")
    }
  }

  // Render likes
  const renderLikes = (likes) => {
    console.log("Rendering likes:", likes.length)

    if (!likesList) {
      console.error("Likes list element not found")
      return
    }

    likesList.innerHTML = ""

    if (noLikesMessage) {
      noLikesMessage.classList.add("hidden")
    }

    likes.forEach((like) => {
      const { otherUser, hasRose, isMutualMatch } = like

      // Get user photo with proper error handling
      const userPhoto =
        otherUser.photos && otherUser.photos.length > 0 ? otherUser.photos[0] : "images/default-avatar.png"

      // Create like card
      const likeCard = document.createElement("div")
      likeCard.className = `like-card ${hasRose ? "has-rose" : ""} ${isMutualMatch ? "is-match" : ""}`
      likeCard.dataset.userId = otherUser.id

      // Sanitize user data to prevent XSS
      const displayName = document.createTextNode(otherUser.displayName || otherUser.name || "Anonymous").textContent

      likeCard.innerHTML = `
  <div class="like-photo" style="background-image: url('${userPhoto}')">
    ${hasRose ? '<div class="like-rose-indicator"><i class="fas fa-rose"></i></div>' : ""}
    ${isMutualMatch ? '<div class="like-match-indicator"><i class="fas fa-check-circle"></i></div>' : ""}
  </div>
  <div class="like-info">
    <h3>${displayName}</h3>
    <p>${hasRose ? "Sent you a rose!" : "Liked your profile"}</p>
  </div>
  <div class="like-actions">
    ${
      isMutualMatch
        ? `
        <button class="btn primary-btn message-btn" data-user-id="${otherUser.id}">
          <i class="fas fa-comment"></i> Message
        </button>
      `
        : `
        <button class="btn primary-btn like-back-btn" data-user-id="${otherUser.id}" data-name="${displayName}" data-photo="${userPhoto}">
          <i class="fas fa-heart"></i> Like Back
        </button>
      `
    }
    <button class="btn secondary-btn view-profile-btn" data-user-id="${otherUser.id}">
      <i class="fas fa-user"></i> View Profile
    </button>
  </div>
`

      // Add event listeners using event delegation
      likeCard.addEventListener("click", (e) => {
        if (e.target.closest(".message-btn")) {
          const userId = e.target.closest(".message-btn").getAttribute("data-user-id")
          openChat(userId)
        } else if (e.target.closest(".like-back-btn")) {
          const likeBtn = e.target.closest(".like-back-btn")
          const userId = likeBtn.getAttribute("data-user-id")
          const userName = likeBtn.getAttribute("data-name")
          const userPhoto = likeBtn.getAttribute("data-photo")
          likeBack(userId, userName, userPhoto)
        } else if (e.target.closest(".view-profile-btn")) {
          const userId = e.target.closest(".view-profile-btn").getAttribute("data-user-id")
          viewProfile(userId)
        }
      })

      likesList.appendChild(likeCard)
    })

    // Show the correct tab content
    if (activeTab === "likes") {
      showTab("likes")
    }
  }

  // Like back a user
  const likeBack = async (userId, userName, userPhoto) => {
    console.log("Liking back user:", userId)

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get current user's profile for the match popup
      const currentUserDoc = await db.collection("users").doc(user.uid).get()
      if (!currentUserDoc.exists) {
        console.error("Current user profile not found")
        return
      }
      const currentUserData = currentUserDoc.data()
      const currentUserPhoto =
        currentUserData.photos && currentUserData.photos.length > 0
          ? currentUserData.photos[0]
          : "images/default-avatar.png"

      // Create like document
      await db.collection("likes").add({
        userId: user.uid,
        likedUserId: userId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      })

      // Create match document
      const userIds = [user.uid, userId].sort()
      const matchId = userIds.join("_")

      await db
        .collection("matches")
        .doc(matchId)
        .set(
          {
            users: userIds,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unreadCount: {
              [user.uid]: 0,
              [userId]: 0,
            },
            confirmed: true,
          },
          { merge: true },
        )

      // Update the like card to show it's now a match
      const likeCard = document.querySelector(`.like-card[data-user-id="${userId}"]`)
      if (likeCard) {
        likeCard.classList.add("is-match")

        // Replace the like-back button with a message button
        const actionDiv = likeCard.querySelector(".like-actions")
        if (actionDiv) {
          const likeBackBtn = actionDiv.querySelector(".like-back-btn")
          if (likeBackBtn) {
            const messageBtn = document.createElement("button")
            messageBtn.className = "btn primary-btn message-btn"
            messageBtn.setAttribute("data-user-id", userId)
            messageBtn.innerHTML = '<i class="fas fa-comment"></i> Message'
            messageBtn.addEventListener("click", () => openChat(userId))
            actionDiv.replaceChild(messageBtn, likeBackBtn)
          }
        }

        // Add the match indicator
        const photoDiv = likeCard.querySelector(".like-photo")
        if (photoDiv && !photoDiv.querySelector(".like-match-indicator")) {
          const matchIndicator = document.createElement("div")
          matchIndicator.className = "like-match-indicator"
          matchIndicator.innerHTML = '<i class="fas fa-check-circle"></i>'
          photoDiv.appendChild(matchIndicator)
        }

        // Add match animation to the card
        const matchAnimation = document.createElement("div")
        matchAnimation.className = "match-animation-overlay"
        matchAnimation.innerHTML = `
          <div class="match-animation-content">
            <i class="fas fa-heart match-heart-icon"></i>
            <span>It's a Match!</span>
          </div>
        `
        likeCard.appendChild(matchAnimation)

        // Remove the animation after it plays
        setTimeout(() => {
          matchAnimation.remove()
        }, 2000)
      }

      // Show match popup
      showMatchPopup(currentUserData.displayName || "You", userName, currentUserPhoto, userPhoto)

      // Create confetti effect
      createConfetti()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("It's a match! You can now message each other.", "success")
      }

      // Reload matches
      loadMatches()
    } catch (error) {
      console.error("Error liking back user:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error liking back user. Please try again.", "error")
      }
    }
  }

  // Show match popup
  const showMatchPopup = (currentUserName, otherUserName, currentUserPhoto, otherUserPhoto) => {
    // Create match popup
    const matchPopup = document.createElement("div")
    matchPopup.className = "match-popup"
    matchPopup.innerHTML = `
      <div class="match-popup-content">
        <div class="match-header">
          <h2>It's a Match!</h2>
          <p>You and ${otherUserName} have liked each other</p>
        </div>
        <div class="match-images">
          <div class="match-image" style="background-image: url('${currentUserPhoto}')"></div>
          <div class="match-heart">
            <i class="fas fa-heart"></i>
          </div>
          <div class="match-image" style="background-image: url('${otherUserPhoto}')"></div>
        </div>
        <div class="match-actions">
          <button class="btn primary-btn send-message-btn" data-user-id="${otherUserPhoto}">
            <i class="fas fa-comment"></i> Send a Message
          </button>
          <button class="btn secondary-btn keep-swiping-btn">
            <i class="fas fa-sync"></i> Keep Browsing
          </button>
        </div>
      </div>
    `

    // Add event listeners
    const sendMessageBtn = matchPopup.querySelector(".send-message-btn")
    const keepSwipingBtn = matchPopup.querySelector(".keep-swiping-btn")

    if (sendMessageBtn) {
      sendMessageBtn.addEventListener("click", () => {
        const userId = sendMessageBtn.getAttribute("data-user-id")
        closeMatchPopup(matchPopup)
        openChat(userId)
      })
    }

    if (keepSwipingBtn) {
      keepSwipingBtn.addEventListener("click", () => {
        closeMatchPopup(matchPopup)
      })
    }

    // Add popup to the DOM
    document.body.appendChild(matchPopup)

    // Close popup when clicking outside
    matchPopup.addEventListener("click", (e) => {
      if (e.target === matchPopup) {
        closeMatchPopup(matchPopup)
      }
    })
  }

  // Close match popup
  const closeMatchPopup = (popup) => {
    popup.classList.add("fade-out")
    setTimeout(() => {
      popup.remove()
    }, 300)
  }

  // Create confetti effect
  const createConfetti = () => {
    const colors = ["#ff6b6b", "#4caf50", "#2196f3", "#ff9800", "#e91e63"]
    const confettiCount = 100

    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement("div")
      confetti.className = "confetti"
      confetti.style.left = Math.random() * 100 + "vw"
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
      confetti.style.width = Math.random() * 10 + 5 + "px"
      confetti.style.height = Math.random() * 10 + 5 + "px"
      confetti.style.opacity = Math.random() + 0.5
      confetti.style.animationDuration = Math.random() * 3 + 2 + "s"
      document.body.appendChild(confetti)

      // Remove confetti after animation
      setTimeout(() => {
        confetti.remove()
      }, 5000)
    }
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
    loadLikes,
    openChat,
    viewProfile,
    refreshMatches: () => {
      loadMatches()
      loadLikes()
    },
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
