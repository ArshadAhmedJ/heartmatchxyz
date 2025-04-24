// Immediately expose the onboardingModule to the global scope
window.onboardingModule = (() => {
  // DOM elements
  let onboardingPage,
    onboardingSteps,
    nextButtons,
    prevButtons,
    progressBar,
    photoUploadArea,
    photoPreviewContainer,
    completeOnboardingBtn,
    interestInput,
    addInterestBtn,
    photoUploadInput

  // State
  let currentStep = 0
  let totalSteps = 0
  const userData = {
    photos: [],
    interests: [],
    preferences: {
      interestedIn: null, // Will be set automatically based on gender
      ageRange: {
        min: 18,
        max: 50,
      },
      maxDistance: 50,
    },
  }

  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyAsc5FpnqdJdUXql2jAIPf7-VSLIv4TIv0",
    authDomain: "datingapp-482ac.firebaseapp.com",
    projectId: "datingapp-482ac",
    storageBucket: "datingapp-482ac.firebasestorage.app",
    messagingSenderId: "672058081482",
    appId: "1:672058081482:web:d61e90a5f397eb46e4b433",
    measurementId: "G-F300RLDGVF",
  }

  // Initialize Firebase if not already initialized
  let firebase
  if (typeof firebase === "undefined") {
    try {
      firebase = window.firebase
    } catch (e) {
      console.error("Firebase is not properly imported or initialized.")
    }
  }

  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig)
  }

  // Initialize onboarding
  const init = () => {
    console.log("Onboarding module init called")

    // Check if Firebase is initialized
    if (typeof firebase === "undefined") {
      console.error("Firebase is not defined. Make sure Firebase SDK is loaded before initializing onboarding.")
      return
    }

    // Get DOM elements after the page has loaded
    onboardingPage = document.getElementById("onboarding-page")
    onboardingSteps = document.querySelectorAll(".onboarding-step")
    nextButtons = document.querySelectorAll(".next-step-btn")
    prevButtons = document.querySelectorAll(".prev-step-btn")
    progressBar = document.querySelector(".progress-bar-inner")
    photoUploadArea = document.getElementById("photo-upload-area")
    photoPreviewContainer = document.getElementById("photo-preview-container")
    completeOnboardingBtn = document.getElementById("complete-onboarding-btn")
    interestInput = document.getElementById("interest-input")
    addInterestBtn = document.getElementById("add-interest-btn")
    photoUploadInput = document.getElementById("photo-upload")

    totalSteps = onboardingSteps.length
    console.log(`Total onboarding steps: ${totalSteps}`)

    // Add animation classes to steps
    onboardingSteps.forEach((step, index) => {
      step.classList.add("animate__animated")
      if (index === 0) {
        step.classList.add("animate__fadeIn")
      } else {
        step.classList.add("hidden")
      }
    })

    bindEvents()
    updateProgressBar()
    setupPhotoUploadArea()
    setupInterestsAutocomplete()
    createImageUploadBoxes()

    // Check if user is logged in
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = "auth.html"
      }
    })
  }

  // Create the three image upload boxes
  const createImageUploadBoxes = () => {
    if (!photoPreviewContainer) {
      console.error("Photo preview container not found")
      return
    }

    // Clear the container
    photoPreviewContainer.innerHTML = ""

    // Create three image upload boxes
    for (let i = 0; i < 3; i++) {
      const uploadBox = document.createElement("div")
      uploadBox.className = "photo-upload-box"
      uploadBox.innerHTML = `
        <div class="photo-upload-placeholder">
          <i class="fas fa-plus"></i>
          <span>Add Photo</span>
        </div>
        <input type="file" class="photo-upload-input" accept="image/*" data-index="${i}">
      `
      photoPreviewContainer.appendChild(uploadBox)

      // Add click event to open file explorer
      uploadBox.addEventListener("click", (e) => {
        // Don't trigger if clicking on the remove button
        if (e.target.closest(".remove-photo-btn")) {
          return
        }

        const input = uploadBox.querySelector(".photo-upload-input")
        if (input) {
          input.click()
        }
      })

      // Add change event to handle file selection
      const input = uploadBox.querySelector(".photo-upload-input")
      if (input) {
        input.addEventListener("change", (e) => {
          if (e.target.files && e.target.files[0]) {
            const index = Number.parseInt(e.target.getAttribute("data-index"), 10)
            handlePhotoUpload(e, index)
          }
        })
      }
    }

    // Update boxes with existing photos
    updatePhotoBoxes()
  }

  // Add global event delegation for remove buttons
  document.addEventListener("click", (e) => {
    // Check if the clicked element is a remove photo button or its child
    const removeBtn = e.target.closest(".remove-photo-btn")
    if (removeBtn) {
      e.stopPropagation() // Prevent triggering the parent click
      const index = Number.parseInt(removeBtn.getAttribute("data-index"), 10)
      console.log("Remove button clicked for index:", index)
      removePhoto(index)
    }
  })

  // Update photo boxes with existing photos
  const updatePhotoBoxes = () => {
    if (!photoPreviewContainer) return

    const boxes = photoPreviewContainer.querySelectorAll(".photo-upload-box")
    console.log("Updating photo boxes. Current photos:", userData.photos)

    // Update each box based on available photos
    boxes.forEach((box, index) => {
      if (userData.photos[index]) {
        // Show the image
        box.innerHTML = `
          <div class="photo-preview-item" style="background-image: url('${userData.photos[index]}')">
            <button type="button" class="remove-photo-btn" data-index="${index}" aria-label="Remove photo">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <input type="file" class="photo-upload-input" accept="image/*" data-index="${index}">
        `

        // Re-add change event
        const input = box.querySelector(".photo-upload-input")
        if (input) {
          input.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
              const index = Number.parseInt(e.target.getAttribute("data-index"), 10)
              handlePhotoUpload(e, index)
            }
          })
        }
      } else {
        // Show empty placeholder
        box.innerHTML = `
          <div class="photo-upload-placeholder">
            <i class="fas fa-plus"></i>
            <span>Add Photo</span>
          </div>
          <input type="file" class="photo-upload-input" accept="image/*" data-index="${index}">
        `

        // Re-add change event
        const input = box.querySelector(".photo-upload-input")
        if (input) {
          input.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
              const index = Number.parseInt(e.target.getAttribute("data-index"), 10)
              handlePhotoUpload(e, index)
            }
          })
        }
      }
    })
  }

  // Setup photo upload area with drag and drop
  const setupPhotoUploadArea = () => {
    console.log("Setting up photo upload functionality")

    if (!photoUploadInput) {
      console.error("Photo upload input not found")
      return
    }

    // Log elements to verify they exist
    console.log("Photo upload input:", photoUploadInput)
  }

  // Setup interests autocomplete with popular tags
  const setupInterestsAutocomplete = () => {
    if (!interestInput) return

    const popularInterests = [
      "Travel",
      "Photography",
      "Cooking",
      "Hiking",
      "Reading",
      "Music",
      "Movies",
      "Art",
      "Fitness",
      "Yoga",
      "Dancing",
      "Swimming",
      "Running",
      "Cycling",
      "Gaming",
      "Technology",
      "Fashion",
      "Food",
      "Coffee",
      "Wine",
      "Beer",
      "Pets",
      "Dogs",
      "Cats",
      "Nature",
      "Beach",
      "Mountains",
      "Camping",
      "Fishing",
      "Hunting",
      "Sports",
      "Football",
      "Basketball",
      "Baseball",
      "Soccer",
      "Tennis",
      "Golf",
      "Skiing",
      "Snowboarding",
      "Surfing",
    ]

    // Create datalist element
    const datalist = document.createElement("datalist")
    datalist.id = "interest-suggestions"

    // Add options to datalist
    popularInterests.forEach((interest) => {
      const option = document.createElement("option")
      option.value = interest
      datalist.appendChild(option)
    })

    // Add datalist to document
    document.body.appendChild(datalist)

    // Connect input to datalist
    interestInput.setAttribute("list", "interest-suggestions")
  }

  // Show onboarding
  const show = () => {
    console.log("Showing onboarding page")
    if (onboardingPage) {
      onboardingPage.classList.remove("hidden")
    }
  }

  // Hide onboarding
  const hide = () => {
    console.log("Hiding onboarding page")
    if (onboardingPage) {
      onboardingPage.classList.add("hidden")
    }
  }

  // Go to next step with animation
  const nextStep = () => {
    console.log(`Moving from step ${currentStep} to next step`)

    // Validate current step
    if (!validateStep(currentStep)) {
      return
    }

    // Save data from current step
    saveStepData(currentStep)

    // Hide current step with animation
    if (onboardingSteps[currentStep]) {
      onboardingSteps[currentStep].classList.add("animate__fadeOutLeft")
      setTimeout(() => {
        onboardingSteps[currentStep].classList.add("hidden")
        onboardingSteps[currentStep].classList.remove("animate__fadeOutLeft")

        // Increment step
        currentStep++

        // If last step, complete onboarding
        if (currentStep >= totalSteps) {
          completeOnboarding()
          return
        }

        // Show next step with animation
        if (onboardingSteps[currentStep]) {
          onboardingSteps[currentStep].classList.remove("hidden")
          onboardingSteps[currentStep].classList.add("animate__fadeInRight")
          setTimeout(() => {
            onboardingSteps[currentStep].classList.remove("animate__fadeInRight")
          }, 500)
        }

        // Update progress bar
        updateProgressBar()
      }, 300)
    }
  }

  // Go to previous step with animation
  const prevStep = () => {
    console.log(`Moving from step ${currentStep} to previous step`)

    // Hide current step with animation
    if (onboardingSteps[currentStep]) {
      onboardingSteps[currentStep].classList.add("animate__fadeOutRight")
      setTimeout(() => {
        onboardingSteps[currentStep].classList.add("hidden")
        onboardingSteps[currentStep].classList.remove("animate__fadeOutRight")

        // Decrement step
        currentStep--

        // If before first step, go to first step
        if (currentStep < 0) {
          currentStep = 0
        }

        // Show previous step with animation
        if (onboardingSteps[currentStep]) {
          onboardingSteps[currentStep].classList.remove("hidden")
          onboardingSteps[currentStep].classList.add("animate__fadeInLeft")
          setTimeout(() => {
            onboardingSteps[currentStep].classList.remove("animate__fadeInLeft")
          }, 500)
        }

        // Update progress bar
        updateProgressBar()
      }, 300)
    }
  }

  // Update progress bar with animation
  const updateProgressBar = () => {
    if (progressBar) {
      const progress = (currentStep / (totalSteps - 1)) * 100
      console.log(`Updating progress bar to ${progress}%`)
      progressBar.style.transition = "width 0.5s ease"
      progressBar.style.width = `${progress}%`
    }
  }

  // Validate step with improved feedback
  const validateStep = (step) => {
    console.log(`Validating step ${step}`)

    switch (step) {
      case 0: // Basic info
        const displayName = document.getElementById("onboarding-name").value.trim()
        const birthDate = document.getElementById("onboarding-birthdate").value
        const gender = document.querySelector('input[name="gender"]:checked')?.value

        if (!displayName) {
          console.log("Please enter your name to continue.")
          shakeElement(document.getElementById("onboarding-name"))
          return false
        }

        if (!birthDate) {
          console.log("Please enter your birth date to continue.")
          shakeElement(document.getElementById("onboarding-birthdate"))
          return false
        }

        // Validate age (18+)
        const age = calculateAge(new Date(birthDate))
        if (age < 18) {
          console.log("You must be at least 18 years old to use HeartMatch.")
          shakeElement(document.getElementById("onboarding-birthdate"))
          return false
        }

        if (!gender) {
          console.log("Please select your gender to continue.")
          shakeElement(document.querySelector(".radio-group"))
          return false
        }

        return true

      case 1: // Photos
        // At least one photo is required
        if (userData.photos.length === 0 || !userData.photos[0]) {
          console.log("Please upload at least one photo to continue.")
          shakeElement(photoPreviewContainer)
          return false
        }
        return true

      case 2: // Bio
        const bio = document.getElementById("onboarding-bio").value.trim()

        // Bio is required
        if (!bio) {
          console.log("Please write a short bio to continue.")
          shakeElement(document.getElementById("onboarding-bio"))
          return false
        }

        // Bio should be at least 20 characters
        if (bio.length < 20) {
          console.log("Your bio should be at least 20 characters long.")
          shakeElement(document.getElementById("onboarding-bio"))
          return false
        }

        return true

      case 3: // Interests
        // At least 3 interests are required
        if (userData.interests.length < 3) {
          console.log("Please add at least 3 interests to continue.")
          shakeElement(interestInput)
          return false
        }
        return true

      default:
        return true
    }
  }

  // Add shake animation to element for better feedback
  const shakeElement = (element) => {
    if (!element) return

    element.classList.add("animate__animated", "animate__shakeX")
    setTimeout(() => {
      element.classList.remove("animate__animated", "animate__shakeX")
    }, 1000)
  }

  // Save step data
  const saveStepData = (step) => {
    console.log(`Saving data for step ${step}`)

    switch (step) {
      case 0: // Basic info
        userData.displayName = document.getElementById("onboarding-name").value.trim()
        userData.birthDate = document.getElementById("onboarding-birthdate").value
        userData.gender = document.querySelector('input[name="gender"]:checked')?.value
        userData.location = document.getElementById("onboarding-location").value.trim()

        // Set interested in based on gender
        if (userData.gender === "male") {
          userData.preferences.interestedIn = "female"
        } else if (userData.gender === "female") {
          userData.preferences.interestedIn = "male"
        }

        break

      case 1: // Photos
        // Photos are handled by the upload event
        break

      case 2: // Bio
        userData.bio = document.getElementById("onboarding-bio").value.trim()
        break

      case 3: // Interests
        // Interests are handled by the add/remove interest events
        break
    }
  }

  // Handle photo upload with improved UI feedback
  const handlePhotoUpload = async (e, index) => {
    console.log("Photo upload triggered", e)

    const files = e.target.files
    if (!files || files.length === 0) {
      console.log("No files selected")
      return
    }

    console.log("File selected:", files[0].name)

    try {
      const currentUser = firebase.auth().currentUser
      if (!currentUser) {
        console.log("You must be logged in to upload photos.")
        return
      }

      // Show loading indicator on the specific box
      const boxes = photoPreviewContainer.querySelectorAll(".photo-upload-box")
      const box = boxes[index]

      if (box) {
        box.classList.add("uploading")
        box.innerHTML = `
          <div class="photo-upload-loading">
            <div class="spinner"></div>
            <p>Uploading...</p>
          </div>
        `
      }

      const file = files[0]

      // Validate file type
      const validTypes = ["image/jpeg", "image/png", "image/jpg"]
      if (!validTypes.includes(file.type)) {
        console.log("Please upload valid image files (JPEG, PNG).")
        updatePhotoBoxes() // Reset the box
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        console.log("Image size should be less than 5MB.")
        updatePhotoBoxes() // Reset the box
        return
      }

      try {
        // Create storage reference - using the correct path according to security rules
        const storageRef = firebase.storage().ref()
        const fileRef = storageRef.child(`users/${currentUser.uid}/photos/${Date.now()}_${file.name}`)

        // Compress image before uploading
        const compressedFile = await compressImage(file)

        // Upload file
        await fileRef.put(compressedFile)

        // Get download URL
        const downloadURL = await fileRef.getDownloadURL()

        // Update user photos array at the specific index
        if (userData.photos.length <= index) {
          // Expand array if needed
          while (userData.photos.length < index) {
            userData.photos.push(null)
          }
          userData.photos.push(downloadURL)
        } else {
          userData.photos[index] = downloadURL
        }

        console.log("Photo uploaded successfully:", downloadURL)

        // Update the UI
        updatePhotoBoxes()

        console.log("Image uploaded successfully!")
      } catch (error) {
        console.error("Error uploading file:", error)
        console.log("Error uploading image. Please try again.")
        updatePhotoBoxes() // Reset the box
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      console.log("Error uploading image. Please try again.")
      updatePhotoBoxes() // Reset the box
    }
  }

  // Remove photo
  const removePhoto = (index) => {
    console.log("Removing photo at index:", index)

    try {
      // Make sure index is valid
      if (isNaN(index)) {
        console.error("Invalid index for photo removal:", index)
        return
      }

      // Remove from userData
      if (index < userData.photos.length) {
        console.log("Before removal, photos array:", [...userData.photos])
        userData.photos[index] = null

        // Clean up the array (remove trailing nulls)
        while (userData.photos.length > 0 && userData.photos[userData.photos.length - 1] === null) {
          userData.photos.pop()
        }

        console.log("After removal, photos array:", [...userData.photos])

        // Update the UI
        updatePhotoBoxes()

        console.log("Photo removed successfully.")
      } else {
        console.error("Index out of bounds for photo removal:", index)
      }
    } catch (error) {
      console.error("Error removing photo:", error)
    }
  }

  // Compress image before uploading
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      // For very small files, don't compress
      if (file.size < 500 * 1024) {
        console.log("File is small, skipping compression")
        resolve(file)
        return
      }

      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target.result
        img.onload = () => {
          const canvas = document.createElement("canvas")
          let width = img.width
          let height = img.height

          // Max dimensions
          const MAX_WIDTH = 1200
          const MAX_HEIGHT = 1200

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                console.error("Canvas to Blob conversion failed")
                resolve(file) // Fallback to original file
                return
              }

              resolve(
                new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }),
              )
            },
            "image/jpeg",
            0.7,
          ) // 70% quality JPEG
        }

        img.onerror = () => {
          console.error("Error loading image for compression")
          resolve(file) // Fallback to original file
        }
      }
      reader.onerror = (error) => {
        console.error("Error reading file for compression:", error)
        resolve(file) // Fallback to original file
      }
    })
  }

  // Add interest with improved UI
  const addInterest = (interestValue) => {
    console.log("Adding interest")

    if (!interestInput) return

    // If interest value is provided directly (from suggestion tags)
    const interest = interestValue || interestInput.value.trim()

    if (!interest) return

    // Check if interest already exists
    if (userData.interests.includes(interest)) {
      console.log("This interest already exists.")
      shakeElement(interestInput)
      return
    }

    // Add to userData
    userData.interests.push(interest)

    // Add to DOM with animation
    const interestsList = document.getElementById("interests-list")
    if (interestsList) {
      const interestItem = document.createElement("div")
      interestItem.className = "interest-item animate__animated animate__fadeIn"
      interestItem.innerHTML = `
        <span>${interest}</span>
        <button class="remove-interest-btn" data-interest="${interest}" aria-label="Remove interest">
          <i class="fas fa-times"></i>
        </button>
      `

      interestsList.appendChild(interestItem)

      // Add remove event
      const removeBtn = interestItem.querySelector(".remove-interest-btn")
      if (removeBtn) {
        removeBtn.addEventListener("click", () => {
          const interest = removeBtn.getAttribute("data-interest")
          removeInterest(interest)
        })
      }
    }

    // Clear input if it was used
    if (!interestValue) {
      interestInput.value = ""
      interestInput.focus()
    }

    // Update interest count
    updateInterestCount()
  }

  // Remove interest with animation
  const removeInterest = (interest) => {
    console.log("Removing interest:", interest)

    // Remove from userData
    userData.interests = userData.interests.filter((item) => item !== interest)

    // Remove from DOM with animation
    const interestsList = document.getElementById("interests-list")
    if (interestsList) {
      const interestItems = interestsList.querySelectorAll(".interest-item")
      interestItems.forEach((item) => {
        const itemText = item.querySelector("span").textContent
        if (itemText === interest) {
          item.classList.add("animate__fadeOut")
          setTimeout(() => {
            interestsList.removeChild(item)
          }, 300)
        }
      })
    }

    // Update interest count
    updateInterestCount()
  }

  // Update interest count
  const updateInterestCount = () => {
    const countElement = document.getElementById("interest-count")
    if (countElement) {
      countElement.textContent = userData.interests.length

      // Update color based on count
      if (userData.interests.length >= 3) {
        countElement.classList.remove("text-red-500")
        countElement.classList.add("text-green-500")
      } else {
        countElement.classList.remove("text-green-500")
        countElement.classList.add("text-red-500")
      }
    }
  }

  // Complete onboarding with loading state
  const completeOnboarding = async () => {
    console.log("Completing onboarding")

    try {
      const currentUser = firebase.auth().currentUser
      if (!currentUser) {
        console.log("You must be logged in to complete onboarding.")
        window.location.href = "auth.html"
        return
      }

      // Show loading overlay
      const loadingOverlay = document.createElement("div")
      loadingOverlay.className = "loading-overlay"
      loadingOverlay.innerHTML = `
        <div class="loading-content">
          <div class="spinner"></div>
          <h3>Creating your profile...</h3>
          <p>Just a moment while we set everything up!</p>
        </div>
      `
      document.body.appendChild(loadingOverlay)

      // Clean up photos array (remove nulls)
      userData.photos = userData.photos.filter((photo) => photo !== null)

      // Add timestamp
      userData.createdAt = firebase.firestore.FieldValue.serverTimestamp()
      userData.updatedAt = firebase.firestore.FieldValue.serverTimestamp()
      userData.uid = currentUser.uid
      userData.email = currentUser.email

      // Save user data to Firestore
      await firebase.firestore().collection("users").doc(currentUser.uid).set(userData)

      // Update user profile
      await currentUser.updateProfile({
        displayName: userData.displayName,
        photoURL: userData.photos[0] || null,
      })

      // Simulate a slight delay for better UX
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Remove loading overlay
      document.body.removeChild(loadingOverlay)

      console.log("Profile created successfully!")

      // Hide onboarding
      hide()

      // Redirect to dashboard with a welcome message
      setTimeout(() => {
        window.location.href = "dashboard.html?welcome=true"
      }, 1000)
    } catch (error) {
      console.error("Error completing onboarding:", error)

      // Remove loading overlay if it exists
      const overlay = document.querySelector(".loading-overlay")
      if (overlay) {
        document.body.removeChild(overlay)
      }

      console.log("Error creating profile. Please try again.")
    }
  }

  // Calculate age from birthdate
  const calculateAge = (birthDate) => {
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    return age
  }

  // Bind events
  const bindEvents = () => {
    console.log("Binding onboarding events")

    // Next buttons
    nextButtons.forEach((button) => {
      button.addEventListener("click", nextStep)
    })

    // Previous buttons
    prevButtons.forEach((button) => {
      button.addEventListener("click", prevStep)
    })

    // Complete button
    if (completeOnboardingBtn) {
      completeOnboardingBtn.addEventListener("click", completeOnboarding)
    }

    // Interest input
    if (interestInput) {
      interestInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault()
          addInterest()
        }
      })
    }

    if (addInterestBtn) {
      addInterestBtn.addEventListener("click", () => addInterest())
    }

    // Bind suggestion tags
    document.querySelectorAll(".suggestion-tag").forEach((tag) => {
      tag.addEventListener("click", function () {
        const interest = this.textContent.trim()
        addInterest(interest)
      })
    })
  }

  // Public API
  return {
    init,
    show,
    hide,
    nextStep,
    prevStep,
    handlePhotoUpload,
    addInterest,
    removeInterest,
    completeOnboarding,
    removePhoto,
    updatePhotoBoxes,
  }
})()

// Add a direct initialization when the script loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded in onboarding.js")
  if (window.location.pathname.includes("onboarding.html")) {
    console.log("On onboarding page, initializing onboarding module")
    window.onboardingModule.init()
  }
})
