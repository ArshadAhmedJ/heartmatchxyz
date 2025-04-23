// This script adds test profiles to Firestore for testing the discover page
// You can run this script once to populate your database with test profiles

async function addTestProfiles() {
  // Check if Firebase is initialized
  if (!window.firebase) {
    console.error("Firebase not initialized")
    return
  }

  const db = firebase.firestore()
  const auth = firebase.auth()

  // Check if user is logged in
  const user = auth.currentUser
  if (!user) {
    console.error("No user logged in")
    return
  }

  console.log("Adding test profiles...")

  // Sample profile data
  const profiles = [
    {
      displayName: "Emma",
      gender: "female",
      age: 28,
      location: "New York",
      bio: "Coffee enthusiast, book lover, and hiking addict. Looking for someone to share adventures with!",
      interests: ["hiking", "reading", "coffee", "travel"],
      photos: [
        "https://randomuser.me/api/portraits/women/32.jpg",
        "https://randomuser.me/api/portraits/women/33.jpg",
        "https://randomuser.me/api/portraits/women/34.jpg",
      ],
    },
    {
      displayName: "Michael",
      gender: "male",
      age: 30,
      location: "Los Angeles",
      bio: "Fitness trainer by day, foodie by night. Let's grab dinner and talk about life!",
      interests: ["fitness", "cooking", "restaurants", "movies"],
      photos: ["https://randomuser.me/api/portraits/men/42.jpg", "https://randomuser.me/api/portraits/men/43.jpg"],
    },
    {
      displayName: "Sophia",
      gender: "female",
      age: 26,
      location: "Chicago",
      bio: "Art gallery curator with a passion for photography. Looking for someone creative and thoughtful.",
      interests: ["art", "photography", "museums", "wine"],
      photos: [
        "https://randomuser.me/api/portraits/women/52.jpg",
        "https://randomuser.me/api/portraits/women/53.jpg",
        "https://randomuser.me/api/portraits/women/54.jpg",
      ],
    },
    {
      displayName: "James",
      gender: "male",
      age: 32,
      location: "Seattle",
      bio: "Software engineer who loves the outdoors. Coffee addict and dog lover.",
      interests: ["hiking", "coding", "dogs", "coffee"],
      photos: ["https://randomuser.me/api/portraits/men/62.jpg", "https://randomuser.me/api/portraits/men/63.jpg"],
    },
    {
      displayName: "Olivia",
      gender: "female",
      age: 27,
      location: "Boston",
      bio: "Medical student with a love for travel. Looking for someone to explore new places with!",
      interests: ["travel", "medicine", "languages", "cooking"],
      photos: ["https://randomuser.me/api/portraits/women/72.jpg", "https://randomuser.me/api/portraits/women/73.jpg"],
    },
  ]

  // Add each profile to Firestore
  for (const profile of profiles) {
    try {
      // Create a new user document with a random ID
      const userRef = db.collection("users").doc()

      // Add timestamp
      profile.createdAt = firebase.firestore.FieldValue.serverTimestamp()

      // Add the profile data
      await userRef.set(profile)
      console.log(`Added profile: ${profile.displayName}`)
    } catch (error) {
      console.error(`Error adding profile ${profile.displayName}:`, error)
    }
  }

  console.log("Test profiles added successfully!")
  alert("Test profiles added successfully! Refresh the page to see them.")
}

// Add a button to the dashboard to run this script
document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname
  if (path.includes("dashboard.html")) {
    // Create a button
    const button = document.createElement("button")
    button.textContent = "Add Test Profiles"
    button.className = "btn primary-btn"
    button.style.position = "fixed"
    button.style.bottom = "20px"
    button.style.right = "20px"
    button.style.zIndex = "1000"

    // Add click event
    button.addEventListener("click", addTestProfiles)

    // Add to body
    document.body.appendChild(button)
  }
})
