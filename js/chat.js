// Chat Module
const chatModule = (() => {
  // Firebase services
  let firebase, auth, db

  // DOM elements
  let conversationsList
  let chatContainer
  let noConversationsMessage
  let messagesContainer
  let messageInput
  let sendMessageBtn
  let chatHeader
  let currentMatchId = null
  let currentOtherUserId = null
  let messagesListener = null
  const conversationsListener = null
  let isMobileView = false

  // Initialize chat module
  const init = () => {
    console.log("Initializing chat module")

    // Get Firebase services
    if (window.firebase) {
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
    } else {
      console.error("Firebase not initialized in chat module")
      return
    }

    // Get DOM elements
    conversationsList = document.getElementById("conversations-list")
    chatContainer = document.getElementById("chat-container")
    noConversationsMessage = document.getElementById("no-conversations-message")
    messagesContainer = document.querySelector(".messages-container")
    messageInput = document.getElementById("message-input")
    sendMessageBtn = document.getElementById("send-message-btn")
    chatHeader = document.querySelector(".chat-header")

    if (!conversationsList || !chatContainer) {
      console.error("Chat elements not found")
      return
    }

    // Check if we're on mobile
    checkMobileView()

    // Add resize listener to check for mobile view
    window.addEventListener("resize", checkMobileView)

    // Add auth state listener
    auth.onAuthStateChanged((user) => {
      if (user) {
        bindEvents()
        loadConversations()
      } else {
        // Clean up listeners
        if (messagesListener) messagesListener()
        if (conversationsListener) conversationsListener()
        showNoConversationsMessage("Please log in to see your conversations")
      }
    })

    console.log("Chat module initialized")
  }

  // Check if we're in mobile view
  const checkMobileView = () => {
    const wasMobile = isMobileView
    isMobileView = window.innerWidth < 768

    // If we've switched between mobile and desktop, update the UI
    if (wasMobile !== isMobileView) {
      updateChatLayout()
    }
  }

  // Update chat layout based on mobile or desktop view
  const updateChatLayout = () => {
    const chatSection = document.getElementById("chat-section")
    if (!chatSection) return

    if (isMobileView) {
      chatSection.classList.add("mobile-chat-view")

      // If we have a conversation open, show it
      if (currentMatchId) {
        showMobileChatView()
      } else {
        showMobileConversationsList()
      }

      // Add back button if it doesn't exist
      if (!document.getElementById("mobile-chat-back")) {
        const backButton = document.createElement("button")
        backButton.id = "mobile-chat-back"
        backButton.className = "mobile-chat-back"
        backButton.innerHTML = '<i class="fas fa-arrow-left"></i>'
        backButton.addEventListener("click", showMobileConversationsList)

        // Insert at the beginning of chat header
        if (chatHeader) {
          chatHeader.insertBefore(backButton, chatHeader.firstChild)
        }
      }
    } else {
      chatSection.classList.remove("mobile-chat-view")

      // Show both conversations and chat in desktop view
      if (conversationsList.parentElement) {
        conversationsList.parentElement.style.display = "flex"
      }
      if (chatContainer) {
        chatContainer.style.display = currentMatchId ? "flex" : "none"
      }

      // Remove back button if it exists
      const backButton = document.getElementById("mobile-chat-back")
      if (backButton) {
        backButton.remove()
      }
    }
  }

  // Show mobile conversations list view
  const showMobileConversationsList = () => {
    if (!isMobileView) return

    if (conversationsList.parentElement) {
      conversationsList.parentElement.style.display = "flex"
    }
    if (chatContainer) {
      chatContainer.style.display = "none"
    }
  }

  // Show mobile chat view
  const showMobileChatView = () => {
    if (!isMobileView) return

    if (conversationsList.parentElement) {
      conversationsList.parentElement.style.display = "none"
    }
    if (chatContainer) {
      chatContainer.style.display = "flex"
    }
  }

  // Bind events
  const bindEvents = () => {
    console.log("Binding chat events")

    if (sendMessageBtn && messageInput) {
      // Remove existing event listeners if any
      sendMessageBtn.removeEventListener("click", sendMessage)
      messageInput.removeEventListener("keypress", handleMessageKeypress)

      // Add event listeners
      sendMessageBtn.addEventListener("click", sendMessage)
      messageInput.addEventListener("keypress", handleMessageKeypress)
    }

    console.log("Chat events bound")
  }

  // Handle keypress event for message input
  const handleMessageKeypress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Load conversations from mutual likes
  const loadConversations = async () => {
    console.log("Loading conversations")

    try {
      showLoadingState()

      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        showNoConversationsMessage("Please log in to see your conversations")
        return
      }

      // First, get the user's likes
      const likesSnapshot = await db.collection("likes").where("userId", "==", user.uid).get()

      if (likesSnapshot.empty) {
        console.log("No likes found")
        showNoConversationsMessage("You haven't liked anyone yet. Start swiping to find matches!")
        return
      }

      // Get the IDs of users this user has liked
      const likedUserIds = likesSnapshot.docs.map((doc) => doc.data().likedUserId)

      // Now get likes where other users have liked this user
      const reverseLikesSnapshot = await db.collection("likes").where("likedUserId", "==", user.uid).get()

      if (reverseLikesSnapshot.empty) {
        console.log("No reverse likes found")
        showNoConversationsMessage("No one has liked you back yet. Keep swiping!")
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
        showNoConversationsMessage("No mutual matches yet. Keep swiping!")
        return
      }

      // Get user profiles for each match
      const conversationPromises = mutualLikes.map(async (otherUserId) => {
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
            } else {
              // Create match document if it doesn't exist
              matchData = {
                users: userIds,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount: {
                  [user.uid]: 0,
                  [otherUserId]: 0,
                },
                confirmed: true,
              }

              await db.collection("matches").doc(matchId).set(matchData)
            }
          } catch (error) {
            console.log(`Error with match document: ${error.message}`)
            // Continue even if match document has issues
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

          // Get unread count for current user
          const unreadCount = matchData?.unreadCount ? matchData.unreadCount[user.uid] || 0 : 0

          return {
            id: matchId,
            matchData,
            otherUser: {
              id: otherUserId,
              ...otherUserData,
            },
            lastMessage,
            unreadCount,
            lastMessageTimestamp:
              matchData?.lastMessageTimestamp || (lastMessage && lastMessage.timestamp ? lastMessage.timestamp : null),
          }
        } catch (error) {
          console.error(`Error processing conversation with user ${otherUserId}:`, error)
          return null
        }
      })

      // Wait for all promises to resolve
      const conversations = (await Promise.all(conversationPromises)).filter((conv) => conv !== null)

      if (conversations.length === 0) {
        showNoConversationsMessage("You don't have any conversations yet. Match with someone to start chatting!")
        return
      }

      // Sort conversations by last message timestamp
      conversations.sort((a, b) => {
        const getTimestamp = (conv) => {
          if (!conv.lastMessageTimestamp) return 0
          return conv.lastMessageTimestamp.toMillis
            ? conv.lastMessageTimestamp.toMillis()
            : typeof conv.lastMessageTimestamp === "object"
              ? new Date(conv.lastMessageTimestamp).getTime()
              : 0
        }

        return getTimestamp(b) - getTimestamp(a)
      })

      // Render conversations
      renderConversations(conversations)

      // If we have a current conversation open, keep it open
      if (currentMatchId) {
        highlightCurrentConversation()
      }
    } catch (error) {
      console.error("Error processing conversations:", error)
      showNoConversationsMessage("Error loading conversations. Please try again.")
    }
  }

  // Highlight the current conversation in the list
  const highlightCurrentConversation = () => {
    if (!currentMatchId) return

    const conversationItems = document.querySelectorAll(".conversation-item")
    conversationItems.forEach((item) => {
      if (item.getAttribute("data-match-id") === currentMatchId) {
        item.classList.add("active")
      } else {
        item.classList.remove("active")
      }
    })
  }

  // Show loading state
  const showLoadingState = () => {
    if (!conversationsList) return

    conversationsList.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner">
          <i class="fas fa-spinner fa-spin"></i>
        </div>
        <p>Loading conversations...</p>
      </div>
    `

    if (noConversationsMessage) {
      noConversationsMessage.classList.add("hidden")
    }
  }

  // Show no conversations message
  const showNoConversationsMessage = (message) => {
    console.log("Showing no conversations message:", message)

    if (!conversationsList || !noConversationsMessage) {
      console.error("Conversations list or no conversations message element not found")
      return
    }

    conversationsList.innerHTML = ""

    const messageElement = noConversationsMessage.querySelector("p")
    if (messageElement) {
      messageElement.textContent = message
    }

    noConversationsMessage.classList.remove("hidden")

    // Hide chat container
    if (chatContainer) {
      chatContainer.classList.add("hidden")
    }
  }

  // Render conversations
  const renderConversations = (conversations) => {
    console.log("Rendering conversations:", conversations.length)

    if (!conversationsList) {
      console.error("Conversations list element not found")
      return
    }

    conversationsList.innerHTML = ""

    if (noConversationsMessage) {
      noConversationsMessage.classList.add("hidden")
    }

    conversations.forEach((conversation) => {
      const { id, otherUser, lastMessage, unreadCount } = conversation

      // Get user photo with proper error handling
      const userPhoto =
        otherUser.photos && otherUser.photos.length > 0 ? otherUser.photos[0] : "images/default-avatar.png"

      // Format timestamp safely
      let timeString = ""
      if (lastMessage && lastMessage.timestamp) {
        try {
          const timestamp = lastMessage.timestamp.toDate
            ? lastMessage.timestamp.toDate()
            : new Date(lastMessage.timestamp)
          timeString = formatTimeForConversation(timestamp)
        } catch (error) {
          console.error("Error formatting timestamp:", error)
          timeString = ""
        }
      }

      // Create conversation item
      const conversationItem = document.createElement("div")
      conversationItem.className = `conversation-item${unreadCount > 0 ? " unread" : ""}${id === currentMatchId ? " active" : ""}`
      conversationItem.setAttribute("data-match-id", id)
      conversationItem.setAttribute("data-user-id", otherUser.id)

      // Sanitize user data to prevent XSS
      const displayName = document.createTextNode(otherUser.displayName || otherUser.name || "Anonymous").textContent
      const messageText = lastMessage
        ? document.createTextNode(lastMessage.text.substring(0, 40) + (lastMessage.text.length > 40 ? "..." : ""))
            .textContent
        : "Start a conversation!"

      conversationItem.innerHTML = `
        <div class="conversation-photo" style="background-image: url('${userPhoto}')"></div>
        <div class="conversation-info">
          <div class="conversation-header">
            <h3>${displayName}</h3>
            <span class="conversation-time">${timeString}</span>
          </div>
          <div class="conversation-preview">
            <p>${messageText}</p>
            ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ""}
          </div>
        </div>
      `

      // Add event listener using event delegation
      conversationItem.addEventListener("click", () => {
        openConversation(otherUser.id, id)

        // In mobile view, switch to chat view
        if (isMobileView) {
          showMobileChatView()
        }
      })

      conversationsList.appendChild(conversationItem)
    })
  }

  // Format time for conversation list
  const formatTimeForConversation = (timestamp) => {
    const now = new Date()
    const diffDays = Math.floor((now - timestamp) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      // Today - show time
      return timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffDays === 1) {
      // Yesterday
      return "Yesterday"
    } else if (diffDays < 7) {
      // This week - show day name
      return timestamp.toLocaleDateString([], { weekday: "short" })
    } else {
      // Older - show date
      return timestamp.toLocaleDateString([], { month: "short", day: "numeric" })
    }
  }

  // Open conversation with user
  const openConversation = async (userId, matchId) => {
    console.log("Opening conversation with user:", userId, "Match ID:", matchId)

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Store current conversation info
      currentOtherUserId = userId

      // If we have a valid match ID, use it
      if (matchId) {
        currentMatchId = matchId
      } else {
        // Otherwise, create a new match ID
        const userIds = [user.uid, userId].sort()
        currentMatchId = userIds.join("_")
      }

      // Ensure match document exists
      const userIds = [user.uid, userId].sort()

      try {
        // Check if match document exists
        const matchDoc = await db.collection("matches").doc(currentMatchId).get()

        if (!matchDoc.exists) {
          // Create match document if it doesn't exist
          await db
            .collection("matches")
            .doc(currentMatchId)
            .set({
              users: userIds,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
              unreadCount: {
                [user.uid]: 0,
                [userId]: 0,
              },
              confirmed: true,
            })
        }
      } catch (error) {
        console.log("Error with match document:", error)
        // Continue even if there's an error with the match document
      }

      // Highlight current conversation
      highlightCurrentConversation()

      // Get other user's profile
      const otherUserDoc = await db.collection("users").doc(userId).get()
      if (!otherUserDoc.exists) {
        console.error("User not found")
        return
      }

      const otherUserData = otherUserDoc.data()

      // Show chat container
      if (chatContainer) {
        chatContainer.classList.remove("hidden")
      }

      // Update chat header
      if (chatHeader) {
        const userPhoto =
          otherUserData.photos && otherUserData.photos.length > 0
            ? otherUserData.photos[0]
            : "images/default-avatar.png"

        const displayName = document.createTextNode(
          otherUserData.displayName || otherUserData.name || "Anonymous",
        ).textContent

        // Keep the back button if it exists
        const backButton = document.getElementById("mobile-chat-back")
        const backButtonHtml = backButton ? backButton.outerHTML : ""

        chatHeader.innerHTML = `
          ${backButtonHtml}
          <div class="chat-header-user">
            <div class="chat-header-photo" style="background-image: url('${userPhoto}')"></div>
            <h3>${displayName}</h3>
          </div>
          <div class="chat-header-actions">
            <button class="btn secondary-btn view-profile-btn" data-user-id="${userId}">
              <i class="fas fa-user"></i>
            </button>
          </div>
        `

        // Add event listener to view profile button
        const viewProfileBtn = chatHeader.querySelector(".view-profile-btn")
        if (viewProfileBtn) {
          viewProfileBtn.addEventListener("click", () => {
            viewProfile(userId)
          })
        }

        // Re-add event listener to back button if we're in mobile view
        if (isMobileView) {
          const newBackButton = document.getElementById("mobile-chat-back")
          if (newBackButton) {
            newBackButton.addEventListener("click", showMobileConversationsList)
          }
        }
      }

      // Clear messages container
      if (messagesContainer) {
        messagesContainer.innerHTML = `
          <div class="loading-state">
            <div class="loading-spinner">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p>Loading messages...</p>
          </div>
        `
      }

      // Reset unread count
      try {
        await db
          .collection("matches")
          .doc(currentMatchId)
          .update({
            [`unreadCount.${user.uid}`]: 0,
            lastActive: firebase.firestore.FieldValue.serverTimestamp(),
          })
      } catch (error) {
        console.log("Error updating unread count:", error)
        // Continue even if there's an error updating the unread count
      }

      // Load messages
      loadMessages()

      // Focus message input
      if (messageInput) {
        messageInput.focus()
      }
    } catch (error) {
      console.error("Error opening conversation:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error opening conversation. Please try again.", "error")
      }
    }
  }

  // Load messages for current conversation
  const loadMessages = () => {
    console.log("Loading messages for match:", currentMatchId)

    if (!currentMatchId || !messagesContainer) {
      console.error("No current match ID or messages container")
      return
    }

    // Clear previous listener
    if (messagesListener) {
      messagesListener()
    }

    // Set up real-time listener for messages
    messagesListener = db
      .collection("matches")
      .doc(currentMatchId)
      .collection("messages")
      .orderBy("timestamp", "asc")
      .onSnapshot(
        (snapshot) => {
          // Clear messages container
          messagesContainer.innerHTML = ""

          if (snapshot.empty) {
            // Show empty state
            messagesContainer.innerHTML = `
              <div class="empty-chat">
                <div class="empty-chat-icon">
                  <i class="fas fa-comment-dots"></i>
                </div>
                <p>No messages yet. Say hello!</p>
              </div>
            `
            return
          }

          // Process messages
          const user = auth.currentUser
          if (!user) return

          let lastDate = null

          snapshot.docs.forEach((doc) => {
            const messageData = doc.data()
            const isMine = messageData.senderId === user.uid

            // Handle timestamp safely
            let timestamp
            try {
              timestamp = messageData.timestamp
                ? messageData.timestamp.toDate
                  ? messageData.timestamp.toDate()
                  : new Date(messageData.timestamp)
                : new Date()
            } catch (error) {
              console.error("Error parsing timestamp:", error)
              timestamp = new Date()
            }

            const messageDate = timestamp.toDateString()

            // Add date separator if needed
            if (lastDate !== messageDate) {
              const dateSeparator = document.createElement("div")
              dateSeparator.className = "date-separator"
              dateSeparator.innerHTML = `<span>${formatDate(timestamp)}</span>`
              messagesContainer.appendChild(dateSeparator)

              lastDate = messageDate
            }

            // Sanitize message text
            const messageText = document.createTextNode(messageData.text || "").textContent
            const messageTime = timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

            // Create message element
            const messageElement = document.createElement("div")
            messageElement.className = `message ${isMine ? "message-mine" : "message-other"}`
            messageElement.dataset.messageId = doc.id

            messageElement.innerHTML = `
              <div class="message-content">
                <p>${messageText}</p>
                <span class="message-time">${messageTime}</span>
              </div>
            `

            messagesContainer.appendChild(messageElement)
          })

          // Scroll to bottom
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        },
        (error) => {
          console.error("Error loading messages:", error)
          messagesContainer.innerHTML = `
            <div class="empty-chat">
              <div class="empty-chat-icon">
                <i class="fas fa-exclamation-circle"></i>
              </div>
              <p>Error loading messages. Please try again.</p>
            </div>
          `
        },
      )
  }

  // Format date for message separators
  const formatDate = (date) => {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === now.toDateString()) {
      return "Today"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday"
    } else {
      return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    }
  }

  // Send message
  const sendMessage = async () => {
    console.log("Sending message")

    if (!currentMatchId || !messageInput || !messageInput.value.trim()) {
      return
    }

    const messageText = messageInput.value.trim()
    messageInput.value = ""

    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return
      }

      // Get timestamp to use for both operations
      const timestamp = firebase.firestore.FieldValue.serverTimestamp()

      // Add message to Firestore
      await db.collection("matches").doc(currentMatchId).collection("messages").add({
        text: messageText,
        senderId: user.uid,
        timestamp: timestamp,
        read: false,
      })

      // Update match with last message info
      await db
        .collection("matches")
        .doc(currentMatchId)
        .update({
          lastMessageTimestamp: timestamp,
          lastMessageText: messageText.substring(0, 100),
          lastMessageSenderId: user.uid,
          [`unreadCount.${currentOtherUserId}`]: firebase.firestore.FieldValue.increment(1),
          lastActive: timestamp,
        })
    } catch (error) {
      console.error("Error sending message:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error sending message. Please try again.", "error")
      }
    }
  }

  // Create new conversation
  const createNewConversation = async (userId) => {
    try {
      const user = auth.currentUser
      if (!user) {
        console.error("No user logged in")
        return null
      }

      // Create match ID
      const userIds = [user.uid, userId].sort()
      const matchId = userIds.join("_")

      // Check if match document exists
      try {
        const matchDoc = await db.collection("matches").doc(matchId).get()

        if (!matchDoc.exists) {
          // Create match document if it doesn't exist
          await db
            .collection("matches")
            .doc(matchId)
            .set({
              users: userIds,
              timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
              unreadCount: {
                [user.uid]: 0,
                [userId]: 0,
              },
              confirmed: true,
            })
        }
      } catch (error) {
        console.log("Error with match document:", error)
        // Continue even if there's an error with the match document
      }

      // Open the conversation
      openConversation(userId, matchId)
      return matchId
    } catch (error) {
      console.error("Error creating conversation:", error)
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error creating conversation. Please try again.", "error")
      }
      return null
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

  // Refresh conversations
  const refreshConversations = () => {
    loadConversations()
  }

  // Public methods
  const publicAPI = {
    init,
    openConversation,
    createNewConversation,
    refreshConversations,
    viewProfile,
  }

  // Expose module
  window.chatModule = publicAPI

  return publicAPI
})()

// Initialize on load if we're on the dashboard page
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    console.log("Auto-initializing chat module")
    setTimeout(() => {
      if (window.chatModule) {
        chatModule.init()
      }
    }, 400)
  }
})
