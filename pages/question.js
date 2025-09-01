// Health Questionnaire Application
class HealthQuestionnaire {
  constructor() {
    this.currentStep = 1;
    this.maxSteps = 4;
    this.userData = {
      gender: "",
      age: "",
      country: "Nigeria", // Default value
      state: "",
      location: "",
      conditions: [],
      otherConditionText: "",
      medication: "",
      allergies: "",
      allergyTypes: "",
      smokeDrink: "",
      exercise: "",
      sleep: "",
      chatHistory: [],
      lastUpdated: new Date().toISOString(),
    };

    // Track diagnostic information quality
    this.diagnosticTracking = {
      questionsAsked: 0,
      qualityResponses: 0,
      informationAreas: {
        timing: false, // When symptoms started
        severity: false, // How severe symptoms are
        triggers: false, // What makes it better/worse
        associated: false, // Other related symptoms
        location: false, // Where symptoms occur
        duration: false, // How long symptoms last
        pattern: false, // Pattern of symptoms
      },
      lastUserResponse: "",
      engagementLevel: "low", // low, medium, high
      readyForDiagnosis: false,
      conversationState: "diagnosis", // "diagnosis" or "explanation"
      diagnosisProvided: false,
      lastDiagnosis: null,
      askedQuestions: new Set(), // Track questions already asked
    };

    this.init();
  }

  init() {
    this.checkExistingProfile();
    this.attachEventListeners();
    this.showReloadWarning();
  }

  checkExistingProfile() {
    const savedProfile = localStorage.getItem("healthProfile");
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        // Check if profile is complete
        if (this.isProfileComplete(profile)) {
          this.userData = profile;
          // Also load diagnostic tracking if available
          if (profile.diagnosticTracking) {
            // Restore askedQuestions as a Set (it was serialized for storage)
            const restoredAsked =
              profile.diagnosticTracking.askedQuestions || [];
            const askedArray = Array.isArray(restoredAsked)
              ? restoredAsked
              : Object.values(restoredAsked || {});

            this.diagnosticTracking = {
              ...this.diagnosticTracking,
              ...profile.diagnosticTracking,
              askedQuestions: new Set(askedArray),
            };
          }
          this.showChatInterface();
          return;
        }
      } catch (e) {
        console.log("Error parsing saved profile:", e);
      }
    }
    this.showStep(1);
  }

  isProfileComplete(profile) {
    const required = [
      "gender",
      "age",
      "state",
      "location",
      "medication",
      "allergies",
      "smokeDrink",
      "exercise",
      "sleep",
    ];
    return required.every((field) => profile[field] && profile[field] !== "");
  }

  showReloadWarning() {
    window.addEventListener("beforeunload", (e) => {
      if (!this.isProfileComplete(this.userData)) {
        e.preventDefault();
        e.returnValue =
          "You will lose your progress if you reload the page. Are you sure?";
        return e.returnValue;
      }
    });
  }

  attachEventListeners() {
    // Navigation buttons
    document.addEventListener("click", (e) => {
      if (e.target.classList.contains("next-btn")) {
        const nextStep = e.target.getAttribute("data-next");
        this.handleNext(nextStep);
      } else if (e.target.classList.contains("prev-btn")) {
        const prevStep = e.target.getAttribute("data-prev");
        this.handlePrevious(prevStep);
      } else if (e.target.classList.contains("complete-btn")) {
        this.completeProfile();
      }
    });

    // Form inputs
    document.addEventListener("change", (e) => {
      this.handleFormChange(e);
    });

    // Allergy conditional display
    document.addEventListener("change", (e) => {
      if (e.target.name === "allergies") {
        this.toggleAllergyDetails(e.target.value);
      }
    });

    // Others condition conditional display
    document.addEventListener("change", (e) => {
      if (e.target.name === "conditions" && e.target.value === "others") {
        this.toggleOthersCondition(e.target.checked);
      }
    }); // Chat functionality
    this.setupChatEventListeners();

    // Condition checkbox logic (none should uncheck others)
    document.addEventListener("change", (e) => {
      if (e.target.name === "conditions") {
        this.handleConditionChange(e);
      }
    });
  }

  handleConditionChange(e) {
    const isNone = e.target.value === "none";
    const isOthers = e.target.value === "others";
    const conditionCheckboxes = document.querySelectorAll(
      'input[name="conditions"]'
    );

    if (isNone && e.target.checked) {
      // If "None" is checked, uncheck all others
      conditionCheckboxes.forEach((cb) => {
        if (cb.value !== "none") cb.checked = false;
      });
      // Hide others condition input
      this.toggleOthersCondition(false);
    } else if (!isNone && e.target.checked) {
      // If any other condition is checked, uncheck "None"
      const noneCheckbox = document.querySelector(
        'input[name="conditions"][value="none"]'
      );
      if (noneCheckbox) noneCheckbox.checked = false;
    }

    // Show/hide others condition input
    if (isOthers) {
      this.toggleOthersCondition(e.target.checked);
    }
  }

  toggleOthersCondition(show) {
    const othersDetails = document.querySelector(".others-condition-details");
    if (show) {
      othersDetails.style.display = "block";
    } else {
      othersDetails.style.display = "none";
      const otherInput = document.getElementById("other-condition-text");
      if (otherInput) {
        otherInput.value = "";
        this.userData.otherConditionText = "";
      }
    }
  }

  toggleAllergyDetails(value) {
    const allergyDetails = document.querySelector(".allergy-details");
    if (value === "yes") {
      allergyDetails.style.display = "block";
    } else {
      allergyDetails.style.display = "none";
      document.getElementById("allergy-types").value = "";
    }
  }

  handleFormChange(e) {
    const { name, value, type } = e.target;

    console.log("Form change:", { name, value, type }); // Debug log

    if (type === "radio") {
      // Map field names properly
      if (name === "smokeDrink") {
        this.userData.smokeDrink = value;
      } else {
        this.userData[name] = value;
      }
    } else if (type === "checkbox" && name === "conditions") {
      this.updateConditions();
    } else if (name === "allergy-types") {
      this.userData.allergyTypes = value;
    } else if (name === "other-condition-text") {
      this.userData.otherConditionText = value;
    } else if (
      type === "select-one" ||
      name === "country" ||
      name === "state"
    ) {
      // Handle select elements specifically
      this.userData[name] = value;
    } else {
      this.userData[name] = value;
    }

    console.log("Updated userData:", this.userData); // Debug log
    this.saveToLocalStorage();
  }

  updateConditions() {
    const checkedConditions = Array.from(
      document.querySelectorAll('input[name="conditions"]:checked')
    ).map((cb) => cb.value);
    this.userData.conditions = checkedConditions;
  }

  validateStep(step) {
    console.log("Validating step:", step, "UserData:", this.userData); // Debug log

    switch (step) {
      case 1:
        return this.userData.gender && this.userData.age;
      case 2:
        return (
          this.userData.country && this.userData.state && this.userData.location
        );
      case 3:
        const hasConditions =
          this.userData.conditions && this.userData.conditions.length > 0;
        const hasMedication = this.userData.medication;
        const hasAllergies = this.userData.allergies;

        // Check if "others" condition is selected and has text
        const hasOthers =
          this.userData.conditions &&
          this.userData.conditions.includes("others");
        const othersValid =
          !hasOthers ||
          (hasOthers &&
            this.userData.otherConditionText &&
            this.userData.otherConditionText.trim() !== "");

        const allergyValid =
          this.userData.allergies !== "yes" ||
          (this.userData.allergyTypes &&
            this.userData.allergyTypes.trim() !== "");

        console.log("Medical validation:", {
          hasConditions,
          hasMedication,
          hasAllergies,
          othersValid,
          allergyValid,
          conditions: this.userData.conditions,
          medication: this.userData.medication,
          allergies: this.userData.allergies,
        });

        return (
          hasConditions &&
          hasMedication &&
          hasAllergies &&
          allergyValid &&
          othersValid
        );
      case 4:
        return (
          this.userData.smokeDrink &&
          this.userData.exercise &&
          this.userData.sleep
        );
      default:
        return false;
    }
  }

  showValidationError(message) {
    this.showToast(message, "error");
  }

  showToast(message, type = "error", duration = 5000) {
    const toastContainer = document.getElementById("toastContainer");
    if (!toastContainer) return;

    // Create toast element
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    // Create close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close";
    closeBtn.innerHTML = "×";
    closeBtn.onclick = () => this.removeToast(toast);

    // Create progress bar
    const progressBar = document.createElement("div");
    progressBar.className = "toast-progress";

    // Set toast content
    toast.innerHTML = `
            <span class="toast-message">${message}</span>
        `;
    toast.appendChild(closeBtn);
    toast.appendChild(progressBar);

    // Add to container
    toastContainer.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.classList.add("show");
    }, 100);

    // Auto remove after duration
    setTimeout(() => {
      this.removeToast(toast);
    }, duration);

    return toast;
  }

  removeToast(toast) {
    if (toast && toast.parentNode) {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    }
  }

  handleNext(nextStep) {
    if (!this.validateStep(this.currentStep)) {
      this.showValidationError(
        "Please complete all required fields before proceeding."
      );
      return;
    }

    this.currentStep++;
    this.showStep(this.getStepNumber(nextStep));
  }

  handlePrevious(prevStep) {
    this.currentStep--;
    this.showStep(this.getStepNumber(prevStep));
  }

  getStepNumber(stepName) {
    const stepMap = {
      demographics: 1,
      geography: 2,
      medical: 3,
      lifestyle: 4,
      chat: 5,
    };
    return stepMap[stepName] || 1;
  }

  showStep(stepNumber) {
    // Hide all containers
    document.querySelectorAll(".container").forEach((container) => {
      container.classList.remove("active-container");
    });

    // Show target container
    const stepMap = {
      1: ".demographics-container",
      2: ".geography-container",
      3: ".medical-container",
      4: ".lifestyle-container",
      5: ".chat-container",
    };

    const targetContainer = document.querySelector(stepMap[stepNumber]);
    if (targetContainer) {
      setTimeout(() => {
        targetContainer.classList.add("active-container");
      }, 100);
    }

    // Update progress bar
    this.updateProgressBar(stepNumber);
    this.currentStep = stepNumber;
  }

  updateProgressBar(currentStep) {
    document.querySelectorAll(".progress-step").forEach((step, index) => {
      const stepNumber = index + 1;
      step.classList.remove("active", "completed");

      if (stepNumber < currentStep) {
        step.classList.add("completed");
      } else if (stepNumber === currentStep) {
        step.classList.add("active");
      }
    });
  }

  completeProfile() {
    if (!this.validateStep(4)) {
      this.showValidationError(
        "Please complete all required fields before proceeding."
      );
      return;
    }

    this.userData.lastUpdated = new Date().toISOString();
    this.saveToLocalStorage();
    this.showToast(
      "Profile completed successfully! Welcome to the health assistant.",
      "success"
    );
    this.showChatInterface();
  }

  showChatInterface() {
    // Hide the article sidebar content when showing chat
    const articleElement = document.querySelector(".article");
    if (articleElement) {
      articleElement.style.display = "none";
    }

    this.showStep(5);
    this.initializeChat();
  }

  saveToLocalStorage() {
    try {
      // Include diagnostic tracking in the saved data
      const dataToSave = {
        ...this.userData,
        // askedQuestions is a Set in memory; serialize as array for storage
        diagnosticTracking: {
          ...this.diagnosticTracking,
          askedQuestions: Array.from(
            this.diagnosticTracking.askedQuestions || []
          ),
        },
      };
      localStorage.setItem("healthProfile", JSON.stringify(dataToSave));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  }

  // Update confidence progress bar
  updateConfidenceProgress() {
    // Check if diagnostic tracking is initialized
    if (!this.diagnosticTracking || !this.diagnosticTracking.informationAreas) {
      return;
    }

    const areas = this.diagnosticTracking.informationAreas;
    const qualityResponses = this.diagnosticTracking.qualityResponses || 0;

    // Calculate progress based on information completeness
    const totalAreas = Object.keys(areas).length;
    const completedAreas = Object.values(areas).filter(Boolean).length;
    const areaProgress = (completedAreas / totalAreas) * 60; // 60% weight for area coverage

    // Add quality response bonus
    const qualityProgress = Math.min(qualityResponses * 8, 40); // 40% weight for quality responses

    const totalProgress = Math.min(areaProgress + qualityProgress, 100);

    // Update progress bar
    const progressFill = document.getElementById("confidenceProgress");
    const progressText = document.getElementById("confidenceText");

    if (progressFill && progressText) {
      progressFill.style.width = `${totalProgress}%`;

      if (totalProgress < 30) {
        progressText.textContent = `Gathering information... ${Math.round(
          totalProgress
        )}%`;
      } else if (totalProgress < 70) {
        progressText.textContent = `Building understanding... ${Math.round(
          totalProgress
        )}%`;
      } else if (totalProgress < 95) {
        progressText.textContent = `Analyzing symptoms... ${Math.round(
          totalProgress
        )}%`;
      } else {
        progressText.textContent = `Ready for diagnosis! ${Math.round(
          totalProgress
        )}%`;
      }
    }

    return totalProgress;
  }

  // Chat functionality
  setupChatEventListeners() {
    const chatInput = document.getElementById("chatInput");
    const sendBtn = document.getElementById("sendBtn");

    if (chatInput && sendBtn) {
      sendBtn.addEventListener("click", () => this.sendMessage());
      chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.sendMessage();
      });
    }
  }

  initializeChat() {
    // Load chat history from userData
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages && this.userData.chatHistory.length > 0) {
      chatMessages.innerHTML = "";
      this.userData.chatHistory.forEach((message) => {
        this.displayMessage(message.content, message.type, message.timestamp);
      });
    }

    // Update confidence progress bar
    this.updateConfidenceProgress();
  }

  // Assess the quality and completeness of user response
  assessResponseQuality(userMessage) {
    const message = userMessage.toLowerCase();
    const wordCount = userMessage.split(/\s+/).length;

    // Assess information areas covered
    const areas = this.diagnosticTracking.informationAreas;

    // Timing indicators
    if (
      /\b(started|began|since|ago|yesterday|today|week|month|day|morning|evening)\b/.test(
        message
      )
    ) {
      areas.timing = true;
    }

    // Severity indicators
    if (
      /\b(severe|mild|moderate|intense|terrible|unbearable|slight|bad|worse|better|scale|out of|pain level)\b/.test(
        message
      )
    ) {
      areas.severity = true;
    }

    // Trigger indicators
    if (
      /\b(when|after|before|during|makes|triggers|worse|better|eating|walking|lying|sitting|movement)\b/.test(
        message
      )
    ) {
      areas.triggers = true;
    }

    // Associated symptoms
    if (
      /\b(also|along with|together|plus|nausea|headache|fever|swelling|rash|numbness|tingling)\b/.test(
        message
      )
    ) {
      areas.associated = true;
    }

    // Location indicators
    if (
      /\b(left|right|upper|lower|back|front|side|chest|head|leg|arm|stomach|abdomen)\b/.test(
        message
      )
    ) {
      areas.location = true;
    }

    // Duration indicators
    if (
      /\b(lasts|duration|hours|minutes|seconds|all day|constant|comes and goes|intermittent)\b/.test(
        message
      )
    ) {
      areas.duration = true;
    }

    // Pattern indicators
    if (
      /\b(daily|weekly|monthly|pattern|regular|irregular|random|cyclical|morning|evening|night)\b/.test(
        message
      )
    ) {
      areas.pattern = true;
    }

    // Assess engagement level - More stringent requirements
    if (
      wordCount < 5 ||
      /^(yes|no|maybe|ok|fine|good|bad|sure|right|correct)$/i.test(
        message.trim()
      )
    ) {
      this.diagnosticTracking.engagementLevel = "low";
      return 0; // Low quality response
    } else if (wordCount < 15) {
      this.diagnosticTracking.engagementLevel = "medium";
      return 1; // Medium quality response
    } else {
      this.diagnosticTracking.engagementLevel = "high";
      return 2; // High quality response
    }
  }

  // Check if enough information is available for diagnosis
  checkDiagnosisReadiness() {
    const areas = this.diagnosticTracking.informationAreas;
    const coveredAreas = Object.values(areas).filter(Boolean).length;
    const qualityResponses = this.diagnosticTracking.qualityResponses;
    const questionsAsked = this.diagnosticTracking.questionsAsked;

    // Reduced requirements: 5+ areas OR 6+ quality responses OR 8+ questions
    const hasEnoughAreas = coveredAreas >= 5;
    const hasEnoughQuality = qualityResponses >= 6;
    const hasEnoughQuestions = questionsAsked >= 8;

    // Ready if ANY of these conditions are met (more flexible)
    this.diagnosticTracking.readyForDiagnosis =
      hasEnoughAreas || hasEnoughQuality || hasEnoughQuestions;

    console.log(
      `Diagnosis readiness: Areas: ${coveredAreas}/7, Quality: ${qualityResponses}, Questions: ${questionsAsked}, Ready: ${this.diagnosticTracking.readyForDiagnosis}`
    );

    return this.diagnosticTracking.readyForDiagnosis;
  }

  // Track bot questions to prevent repetition
  trackBotQuestion(question) {
    // Extract key elements of the question to track
    const questionKey = question
      .toLowerCase()
      .replace(/[?.,!]/g, "")
      .replace(
        /\b(can you|could you|please|tell me|describe|how|what|when|where|are you)\b/g,
        ""
      )
      .trim();

    this.diagnosticTracking.askedQuestions.add(questionKey);
  }

  sendMessage() {
    const chatInput = document.getElementById("chatInput");
    const message = chatInput.value.trim();

    if (!message) return;

    // Check for /result command
    if (message.toLowerCase() === "/result") {
      this.handleResultCommand();
      chatInput.value = "";
      return;
    }

    // Check for /proceed command (force diagnosis with limited info)
    if (message.toLowerCase() === "/proceed") {
      this.handleProceedCommand();
      chatInput.value = "";
      return;
    }

    // Assess response quality and update tracking
    const qualityScore = this.assessResponseQuality(message);
    this.diagnosticTracking.qualityResponses += qualityScore;
    this.diagnosticTracking.lastUserResponse = message;

    // Update confidence progress bar
    this.updateConfidenceProgress();

    // Display user message
    this.displayMessage(message, "user");

    // Add to chat history
    this.addToChatHistory(message, "user");

    // Clear input
    chatInput.value = "";

    // Check diagnosis readiness
    const isReady = this.checkDiagnosisReadiness();

    // Simulate bot response
    this.simulateBotResponse(message);
  }

  async handleResultCommand() {
    // Check if enough information has been gathered
    if (!this.checkDiagnosisReadiness()) {
      const tracking = this.diagnosticTracking;
      const areas = tracking.informationAreas;
      const coveredAreas = Object.values(areas).filter(Boolean).length;

      const insufficientInfoMessage = `I need more information for an accurate diagnosis.

Current status:
• Questions answered: ${tracking.questionsAsked}
• Quality responses: ${tracking.qualityResponses}
• Information areas covered: ${coveredAreas}/7

Send "/proceed" if you want me to make an assessment with limited information (Note: this will be less accurate).

Otherwise, please continue answering questions for a better diagnosis.`;

      this.displayMessage(insufficientInfoMessage, "bot");
      this.addToChatHistory(insufficientInfoMessage, "bot");
      return;
    }

    // Display user message for /result
    this.displayMessage("/result", "user");
    this.addToChatHistory("/result", "user");

    // If ready, proceed with diagnosis
    await this.generateDiagnosis();
  }

  async handleProceedCommand() {
    // Display user message for /proceed
    this.displayMessage("/proceed", "user");
    this.addToChatHistory("/proceed", "user");

    const warningMessage =
      "Proceeding with limited information. Diagnosis accuracy may be reduced.";
    this.displayMessage(warningMessage, "bot");
    this.addToChatHistory(warningMessage, "bot");

    // Force diagnosis generation
    await this.generateDiagnosis();
  }

  async generateDiagnosis() {
    // Show typing indicator
    const sendBtn = document.getElementById("sendBtn");
    sendBtn.disabled = true;
    sendBtn.innerHTML =
      '<img src="images/bot-svgrepo-com.svg" alt="Bot Typing">';

    try {
      // Force conclusion by calling API with conclusion prompt
      const conclusionPrompt = this.buildConclusionPrompt();
      const response = await this.callChatAPIForConclusion(conclusionPrompt);

      // Parse and log the full JSON result
      if (this.isJSONResponse(response)) {
        const conditions = JSON.parse(response.trim());
        console.log("=== DIAGNOSIS RESULTS ===");
        console.log(JSON.stringify(conditions, null, 2));

        // Display only condition names with links to users
        const userResponse = this.formatConditionNames(conditions);
        this.displayMessage(userResponse, "bot");
        this.addToChatHistory(userResponse, "bot");

        // Mark diagnosis as provided
        this.diagnosticTracking.diagnosisProvided = true;
        this.diagnosticTracking.conversationState = "explanation";
      } else {
        // Fallback if not proper JSON
        this.displayMessage(
          "I'll analyze your symptoms and provide a conclusion.",
          "bot"
        );
        this.addToChatHistory(
          "I'll analyze your symptoms and provide a conclusion.",
          "bot"
        );
      }
    } catch (error) {
      console.error("Diagnosis generation error:", error);
      this.displayMessage(
        "Sorry, I'm having trouble generating results right now.",
        "bot"
      );
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML =
        '<img src="./pages/images/send-svgrepo-com.svg" alt="Send">';
    }
  }

  formatConditionNames(conditions) {
    console.log("formatConditionNames called with:", conditions);

    let response =
      "Based on our conversation, here are the possible conditions:<br><br>";

    conditions.forEach((condition, index) => {
      response += `${index + 1}. ${condition.name} (${condition.chance})<br>`;
    });

    response +=
      '<br><button onclick="showResultsModal()" style="background-color: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; margin-top: 1rem;">View Detailed Results</button>';

    // Store the conditions data for the results page
    localStorage.setItem("diagnosisResults", JSON.stringify(conditions));
    console.log("Stored diagnosis data in localStorage:", conditions);

    return response;
  }

  displayMessage(content, type, timestamp = null) {
    // Check if this is a diagnosis message and clear any previous ones
    if (type === "bot" && content.includes("possible conditions")) {
      this.clearPreviousDiagnosisMessages();
    }

    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = `message ${type}-message`;

    const time =
      timestamp ||
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    messageDiv.innerHTML = `
            <div class="message-content">
                <p>${content}</p>
            </div>
            <div class="message-time">${time}</div>
        `;

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Clear any previous diagnosis messages to avoid duplication
  clearPreviousDiagnosisMessages() {
    const chatMessages = document.getElementById("chatMessages");
    const messages = chatMessages.querySelectorAll(".bot-message");

    messages.forEach((message) => {
      const content = message.querySelector(".message-content p");
      if (content && content.innerHTML.includes("possible conditions")) {
        message.remove();
      }
    });

    // Also clean up chat history
    this.userData.chatHistory = this.userData.chatHistory.filter(
      (msg) =>
        !(msg.type === "bot" && msg.content.includes("possible conditions"))
    );
  }

  addToChatHistory(content, type) {
    const message = {
      content,
      type,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    this.userData.chatHistory.push(message);

    // Keep only last 30 messages
    if (this.userData.chatHistory.length > 30) {
      this.userData.chatHistory = this.userData.chatHistory.slice(-30);
    }

    this.saveToLocalStorage();
  }

  async simulateBotResponse(userMessage) {
    // Show typing indicator
    const sendBtn = document.getElementById("sendBtn");
    sendBtn.disabled = true;
    sendBtn.innerHTML =
      '<img src="./images/bot-svgrepo-com.svg" alt="Bot Typing">';

    try {
      // Check if diagnosis should be automatically triggered
      if (
        this.checkDiagnosisReadiness() &&
        !this.diagnosticTracking.diagnosisProvided
      ) {
        console.log("Auto-triggering diagnosis based on readiness criteria");
        await this.generateDiagnosis();
        return;
      }

      const response = await this.callChatAPI(userMessage);

      // Check if response is JSON format (final diagnosis)
      if (this.isJSONResponse(response)) {
        // Mark that diagnosis has been provided
        this.diagnosticTracking.diagnosisProvided = true;
        this.diagnosticTracking.conversationState = "explanation";
        this.diagnosticTracking.lastDiagnosis = response;

        const formattedResponse = this.formatDiagnosisResponse(response);
        this.displayMessage(formattedResponse, "bot");
        this.addToChatHistory(formattedResponse, "bot");
      } else {
        // Track the question to prevent repetition
        this.trackBotQuestion(response);

        this.displayMessage(response, "bot");
        this.addToChatHistory(response, "bot");
      }
    } catch (error) {
      console.error("Chat API error:", error);
      this.displayMessage(
        "Sorry, I'm having trouble connecting right now. Please try again later.",
        "bot"
      );
      this.addToChatHistory(
        "Sorry, I'm having trouble connecting right now. Please try again later.",
        "bot"
      );
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<img src="/images/send-svgrepo-com.svg" alt="Send">';
    }
  }

  isJSONResponse(response) {
    try {
      const parsed = JSON.parse(response.trim());
      return (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed[0].name &&
        parsed[0].chance
      );
    } catch {
      return false;
    }
  }

  formatDiagnosisResponse(jsonResponse) {
    try {
      const conditions = JSON.parse(jsonResponse.trim());
      return this.formatConditionNames(conditions);
    } catch {
      return jsonResponse; // Return original if parsing fails
    }
  }

  async callChatAPI(userMessage) {
    const prompt = this.buildHealthPrompt(userMessage);

    // Get recent chat history for context (last 10 messages)
    const recentHistory = this.userData.chatHistory.slice(-10).map((msg) => ({
      role: msg.type === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    const payload = {
      prompt: prompt,
      chatHistory: recentHistory,
    };

    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract content from OpenAI-style response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.text) {
      return data.text;
    } else {
      throw new Error("Unexpected response format");
    }
  }

  buildHealthPrompt(symptoms) {
    const tracking = this.diagnosticTracking;

    // If we're in explanation mode (after diagnosis), handle differently
    if (
      tracking.conversationState === "explanation" &&
      tracking.diagnosisProvided
    ) {
      return this.buildExplanationPrompt(symptoms);
    }

    // Update tracking for diagnosis mode
    tracking.questionsAsked++;

    const areas = tracking.informationAreas;
    const coveredAreas = Object.values(areas).filter(Boolean).length;

    // If ready for diagnosis, proceed with conclusion
    if (tracking.readyForDiagnosis) {
      return this.buildConclusionPrompt();
    }

    // If we have too many questions but not enough quality info, be honest
    if (tracking.questionsAsked >= 8 && tracking.qualityResponses < 4) {
      return `I understand you might prefer brief answers, but I need more detailed information to provide an accurate diagnosis. 

Without sufficient details about your symptoms (timing, severity, triggers, etc.), I cannot responsibly offer a medical assessment. 

Could you please provide more specific details about your condition? For example:
- When did it start exactly?
- How severe is it on a scale of 1-10?
- What makes it better or worse?

This will help me give you the most accurate possible assessment.`;
    }

    // Get user's main symptoms from the first message
    const firstUserMessage =
      this.userData.chatHistory.find((msg) => msg.type === "user")?.content ||
      symptoms;

    // Generate a question that hasn't been asked before
    const questionType = this.getNextQuestionType(areas);
    const recentQuestions = this.getRecentBotQuestions();

    // System prompt with state awareness
    let prompt = `You are a medical AI assistant helping diagnose: "${firstUserMessage}"

CURRENT DIAGNOSTIC STATE:
- Questions asked: ${tracking.questionsAsked}
- Quality responses received: ${tracking.qualityResponses}
- Information areas covered: ${coveredAreas}/7
- Next question focus: ${questionType}

User Profile: ${this.userData.age} ${this.userData.gender} from ${
      this.userData.state
    }, Nigeria. 
Medical history: ${this.userData.conditions.join(", ") || "no conditions"}
Medications: ${this.userData.medication || "none"}
Allergies: ${this.userData.allergies || "none"}

RECENT BOT QUESTIONS (DON'T REPEAT):
${recentQuestions}

CRITICAL INSTRUCTIONS:
1. Ask ONE focused question about ${questionType} (keep it under 20 words)
2. Be empathetic and encouraging
3. If user gives short answers, gently ask for more detailed information
4. You MUST gather thorough information before diagnosing - need at least 6/7 areas covered, 8+ quality responses, and 12+ questions
5. NEVER provide diagnosis prematurely - keep asking detailed questions until you have comprehensive information
6. DON'T repeat questions that have been answered or asked recently
7. Encourage longer, more descriptive responses when users give brief answers

Ask your next question now:`;

    return prompt;
  }

  buildExplanationPrompt(userMessage) {
    return `You are a medical AI assistant in EXPLANATION MODE. The user has received a diagnosis and now wants more information.

LAST DIAGNOSIS PROVIDED: ${this.diagnosticTracking.lastDiagnosis}

USER QUESTION: "${userMessage}"

INSTRUCTIONS:
1. Answer the user's question about the diagnosed conditions
2. Provide clear, educational explanations
3. Suggest next steps (see a doctor, treatment options, prevention)
4. Be supportive and informative
5. Don't provide new diagnoses - explain the existing ones

Respond helpfully to their question:`;
  }

  getNextQuestionType(areas) {
    const missing = Object.entries(areas).filter(([k, v]) => !v);
    if (missing.length === 0) return "general symptoms";

    // Prioritize important areas
    const priority = [
      "severity",
      "timing",
      "location",
      "duration",
      "triggers",
      "associated",
      "pattern",
    ];
    for (const area of priority) {
      if (!areas[area]) return area;
    }

    return missing[0][0];
  }

  buildConclusionPrompt() {
    const userProfileJson = JSON.stringify(
      {
        demographics: {
          gender: this.userData.gender,
          age: this.userData.age,
        },
        geography: {
          country: this.userData.country,
          state: this.userData.state,
          location: this.userData.location,
        },
        medical: {
          conditions: this.userData.conditions,
          otherConditionText: this.userData.otherConditionText,
          medication: this.userData.medication,
          allergies: this.userData.allergies,
          allergyTypes: this.userData.allergyTypes,
        },
        lifestyle: {
          smokeDrink: this.userData.smokeDrink,
          exercise: this.userData.exercise,
          sleep: this.userData.sleep,
        },
      },
      null,
      2
    );

    // Get all user symptoms from chat history
    const userMessages = this.userData.chatHistory
      .filter((msg) => msg.type === "user" && msg.content !== "/result")
      .map((msg) => msg.content)
      .join(". ");

    return `You are a medical AI assistant. Analyze the user's profile and symptoms to provide a diagnosis conclusion.

--- USER PROFILE ---
${userProfileJson}

--- ALL SYMPTOMS REPORTED ---
${userMessages}

--- TASK ---
Based on the user's profile and all symptoms discussed, provide ONLY a JSON array with the 3 most likely medical conditions.

Respond ONLY with this exact JSON format (no other text):

[
  {
    "name": "Most Likely Condition Name",
    "chance": "X%",
    "reason": "Brief explanation based on symptoms and profile"
  },
  {
    "name": "Second Possible Condition Name", 
    "chance": "Y%",
    "reason": "Brief explanation"
  },
  {
    "name": "Third Possible Condition Name",
    "chance": "Z%",
    "reason": "Brief explanation"
  }
]

Make sure percentages add up to 100% and provide real medical condition names based on the symptoms.`;
  }

  async callChatAPIForConclusion(prompt) {
    const payload = {
      prompt: prompt,
      chatHistory: [], // Fresh context for conclusion
    };

    const response = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract content from OpenAI-style response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else if (data.text) {
      return data.text;
    } else {
      throw new Error("Unexpected response format");
    }
  }

  getRecentBotQuestions() {
    // Get the last 5 bot messages to avoid repetition
    const recentBotMessages = this.userData.chatHistory
      .filter((msg) => msg.type === "bot")
      .slice(-5)
      .map((msg) => msg.content);

    return recentBotMessages.join(" | ");
  }

  // Method to get profile data for API calls (when you integrate with LLM)
  getProfileForAPI() {
    return {
      userProfile: {
        demographics: {
          gender: this.userData.gender,
          age: this.userData.age,
        },
        geography: {
          country: this.userData.country,
          state: this.userData.state,
          location: this.userData.location,
        },
        medical: {
          conditions: this.userData.conditions,
          medication: this.userData.medication,
          allergies: this.userData.allergies,
          allergyTypes: this.userData.allergyTypes,
        },
        lifestyle: {
          smokeDrink: this.userData.smokeDrink,
          exercise: this.userData.exercise,
          sleep: this.userData.sleep,
        },
      },
      chatHistory: this.userData.chatHistory.slice(-15), // Last 15 messages
      presentPrompt:
        "You are a health assistant. Use the user's profile information to provide personalized health guidance. Always recommend consulting healthcare professionals for serious concerns.",
    };
  }
}

// Global function for Start New Profile button
function startNewProfile() {
  // Clear the health profile from localStorage
  localStorage.removeItem("healthProfile");

  // Reload the page to start fresh
  location.reload();
}

// Modal functionality for results confirmation
function showResultsModal() {
  // Get diagnosis data from localStorage
  const diagnosisData = localStorage.getItem("diagnosisResults");
  if (!diagnosisData) {
    alert("No diagnosis data found. Please complete the assessment first.");
    return;
  }

  // Create modal HTML
  const modalHTML = `
    <div id="resultsModal" style="
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    ">
      <div style="
        background: white;
        padding: 30px;
        border-radius: 15px;
        max-width: 500px;
        width: 90%;
        text-align: center;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="color: #2c3e50; margin-bottom: 15px; font-family: 'Boldonse', 'Open Sans', sans-serif;">
          View Detailed Results?
        </h2>
        <p style="color: #5a6c7d; margin-bottom: 25px; line-height: 1.6;">
          You'll be redirected to a detailed results page showing your diagnosis with explanations. 
          Do you want to proceed?
        </p>
        <div style="display: flex; gap: 15px; justify-content: center;">
          <button onclick="confirmViewResults()" style="
            background-color: #3498db;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
          ">
            Yes, View Results
          </button>
          <button onclick="closeResultsModal()" style="
            background-color: #6c757d;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
          ">
            Stay Here
          </button>
        </div>
      </div>
    </div>
  `;

  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

// Function to clear all chat data and restart
function clearChatAndRestart() {
  // Clear all localStorage data
  localStorage.removeItem("diagnosisResults");
  localStorage.removeItem("healthProfile");

  // Reload the page to start fresh
  location.reload();
}

function confirmViewResults() {
  // Close modal first
  closeResultsModal();

  // Redirect to results page (go up one level from pages folder)
  window.location.href = "../resultp.html";
}

function closeResultsModal() {
  const modal = document.getElementById("resultsModal");
  if (modal) {
    modal.remove();
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new HealthQuestionnaire();
});

// Export for potential future use
if (typeof module !== "undefined" && module.exports) {
  module.exports = HealthQuestionnaire;
}
