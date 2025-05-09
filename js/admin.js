// Ad min Dashboard Module
const adminModule = (() => {
  // Firebase services
  let firebase, auth, db, storage, functions

  // State
  let currentUser = null
  let currentSection = "dashboard"
  let verificationRequests = []
  const selectedVerification = null
  let usersList = []
  let currentPage = 1
  const usersPerPage = 10
  let performanceData = {
    responseTime: [],
    apiCalls: [],
    errorRate: [],
  }

  // Real-time listeners
  let verificationListener = null
  let usersListener = null
  let dashboardStatsListener = null

  // Initialize admin module
  const init = () => {
    console.log("Initializing admin module")

    // Add styles to the head for verification UI improvements
    if (!document.getElementById("admin-verification-styles")) {
      const style = document.createElement("style")
      style.id = "admin-verification-styles"
      style.innerHTML = `
        /* Verification UI Improvements */
        .verification-card-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
          margin-top: 20px;
        }
        
        .verification-card {
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .verification-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
        }
        
        .verification-user-info {
          padding: 15px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .user-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 15px;
          border: 2px solid #ff4b7d;
        }
        
        .user-details {
          flex: 1;
        }
        
        .user-details h4 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 18px;
        }
        
        .user-details p {
          margin: 0 0 3px 0;
          color: #666;
          font-size: 13px;
        }
        
        .verification-photo-container {
          position: relative;
          height: 200px;
          overflow: hidden;
        }
        
        .verification-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }
        
        .verification-photo-container:hover .verification-photo {
          transform: scale(1.05);
        }
        
        .verification-actions {
          display: flex;
          padding: 15px;
          gap: 10px;
        }
        
        .verification-actions button {
          flex: 1;
          padding: 10px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: background-color 0.3s ease;
        }
        
        .verification-actions .approve-btn {
          background-color: #4CAF50;
          color: white;
        }
        
        .verification-actions .approve-btn:hover {
          background-color: #3d8b40;
        }
        
        .verification-actions .reject-btn {
          background-color: #F44336;
          color: white;
        }
        
        .verification-actions .reject-btn:hover {
          background-color: #d32f2f;
        }
        
        .verification-actions button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .verification-actions button i {
          font-size: 16px;
        }
        
        .verification-status-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          padding: 5px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .verification-status-badge.pending {
          background-color: #FFC107;
          color: #333;
        }
        
        .verification-status-badge.verified {
          background-color: #4CAF50;
          color: white;
        }
        
        .verification-status-badge.rejected {
          background-color: #F44336;
          color: white;
        }
        
        .verification-timestamp {
          position: absolute;
          bottom: 10px;
          left: 10px;
          padding: 3px 8px;
          background-color: rgba(0, 0, 0, 0.6);
          color: white;
          border-radius: 4px;
          font-size: 12px;
        }
        
        .verification-filter-container {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
          gap: 15px;
          flex-wrap: wrap;
        }
        
        .verification-filter-label {
          font-weight: 500;
          color: #555;
        }
        
        .verification-filter-select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 5px;
          background-color: white;
          min-width: 150px;
        }
        
        .verification-search {
          flex: 1;
          min-width: 200px;
          position: relative;
        }
        
        .verification-search input {
          width: 100%;
          padding: 8px 12px 8px 35px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        
        .verification-search i {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #777;
        }
        
        .verification-refresh-btn {
          padding: 8px 15px;
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 5px;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        
        .verification-refresh-btn:hover {
          background-color: #e0e0e0;
        }
        
        .verification-detail-view {
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-top: 20px;
        }
        
        .verification-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #f0f0f0;
        }
        
        .verification-detail-user {
          display: flex;
          align-items: center;
        }
        
        .verification-detail-photo {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          object-fit: cover;
          margin-right: 15px;
          border: 2px solid #ff4b7d;
        }
        
        .verification-detail-info h3 {
          margin: 0 0 5px 0;
          color: #333;
        }
        
        .verification-detail-info p {
          margin: 0 0 3px 0;
          color: #666;
        }
        
        .verification-detail-status {
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .verification-detail-status.pending {
          background-color: #FFC107;
          color: #333;
        }
        
        .verification-detail-status.verified {
          background-color: #4CAF50;
          color: white;
        }
        
        .verification-detail-status.rejected {
          background-color: #F44336;
          color: white;
        }
        
        .verification-detail-content {
          margin-bottom: 20px;
        }
        
        .user-additional-info {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
          padding: 15px;
          border-radius: 8px;
        }
        
        .user-additional-info p {
          margin: 0;
        }
        
        .verification-photos {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
        }
        
        .verification-photo-card {
          background-color: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .verification-photo-card img {
          width: 100%;
          height: 250px;
          object-fit: cover;
        }
        
        .verification-photo-label {
          padding: 10px;
          text-align: center;
          background-color: #f5f5f5;
          font-weight: 500;
          color: #555;
        }
        
        .verification-detail-actions {
          display: flex;
          justify-content: flex-end;
          gap: 15px;
          margin-top: 20px;
        }
        
        .verification-detail-actions button {
          padding: 10px 20px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background-color 0.3s ease;
        }
        
        .verification-detail-actions .approve-btn {
          background-color: #4CAF50;
          color: white;
        }
        
        .verification-detail-actions .approve-btn:hover {
          background-color: #3d8b40;
        }
        
        .verification-detail-actions .reject-btn {
          background-color: #F44336;
          color: white;
        }
        
        .verification-detail-actions .reject-btn:hover {
          background-color: #d32f2f;
        }
        
        .verification-detail-actions button:disabled {
          background-color: #cccccc;
          cursor: not-allowed;
        }
        
        .verification-detail-actions button i {
          font-size: 18px;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 50px 20px;
          text-align: center;
        }
        
        .empty-state i {
          font-size: 60px;
          color: #ddd;
          margin-bottom: 20px;
        }
        
        .empty-state p {
          color: #777;
          font-size: 18px;
          margin: 0;
        }
        
        /* Login UI Improvements */
        .admin-login-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
        }
        
        .admin-login-card {
          background-color: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
          width: 100%;
          max-width: 450px;
          overflow: hidden;
          animation: fadeIn 0.5s ease-out;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .admin-login-header {
          background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .admin-login-logo {
          width: 100px;
          height: 100px;
          object-fit: contain;
          margin-bottom: 15px;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .admin-login-header h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 600;
        }
        
        .admin-login-body {
          padding: 40px;
          text-align: center;
        }
        
        .admin-login-message {
          margin-bottom: 30px;
          color: #666;
          font-size: 16px;
          line-height: 1.5;
        }
        
        .admin-login-btn {
          background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
          color: white;
          border: none;
          border-radius: 30px;
          padding: 12px 30px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(255, 75, 125, 0.3);
          width: 100%;
        }
        
        .admin-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(255, 75, 125, 0.4);
        }
        
        .admin-login-btn:active {
          transform: translateY(1px);
        }
        
        .admin-login-btn i {
          font-size: 20px;
        }
        
        .admin-login-footer {
          padding: 0 40px 30px;
          text-align: center;
          color: #888;
          font-size: 14px;
        }
        
        .admin-login-footer a {
          color: #ff4b7d;
          text-decoration: none;
        }
        
        .admin-login-footer a:hover {
          text-decoration: underline;
        }

        /* New Daily Stats Card */
        .daily-stats-card {
          background-color: white;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          padding: 20px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
        }

        .daily-stats-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #f0f0f0;
        }

        .daily-stats-header h3 {
          margin: 0;
          color: #333;
          font-size: 18px;
        }

        .daily-stats-date {
          color: #666;
          font-size: 14px;
        }

        .daily-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
        }

        .daily-stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 8px;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .daily-stat-item:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .daily-stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #ff4b7d;
          margin-bottom: 5px;
        }

        .daily-stat-label {
          font-size: 14px;
          color: #666;
          text-align: center;
        }

        .daily-stat-trend {
          display: flex;
          align-items: center;
          margin-top: 5px;
          font-size: 12px;
        }

        .daily-stat-trend.up {
          color: #4CAF50;
        }

        .daily-stat-trend.down {
          color: #F44336;
        }

        .daily-stat-trend i {
          margin-right: 3px;
        }
      `
      document.head.appendChild(style)
    }

    // Add styles for the matches section if they don't exist
    if (!document.getElementById("admin-matches-styles")) {
      const style = document.createElement("style")
      style.id = "admin-matches-styles"
      style.innerHTML = `
/* Enhanced Matches UI */
.matches-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 20px;
  background-color: white;
  padding: 15px;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.matches-filter {
  display: flex;
  align-items: center;
  gap: 10px;
}

.matches-filter-label {
  font-weight: 500;
  color: #555;
  white-space: nowrap;
}

.matches-filter-select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 5px;
  background-color: white;
  min-width: 150px;
}

#matches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 25px;
  margin-top: 20px;
}

.match-card {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.3s ease;
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.match-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
}

.match-header {
  padding: 18px 20px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.match-header::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0) 100%);
  pointer-events: none;
}

.match-title {
  font-weight: 600;
  font-size: 18px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  max-width: 70%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.match-timestamp {
  font-size: 13px;
  opacity: 0.9;
  display: flex;
  align-items: center;
  gap: 5px;
}

.match-timestamp i {
  font-size: 14px;
}

.match-users {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px 20px;
  background-color: #f9f9f9;
  position: relative;
}

.match-user {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 10px;
  position: relative;
  z-index: 1;
}

.match-heart-container {
  position: relative;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
}

.match-heart-bg {
  position: absolute;
  width: 40px;
  height: 40px;
  background-color: rgba(255, 75, 125, 0.1);
  border-radius: 50%;
}

.match-heart {
  font-size: 24px;
  color: #ff4b7d;
  animation: pulse 1.5s infinite;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(255, 75, 125, 0.3));
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

.match-user-photo-container {
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: 15px;
}

.match-user-photo {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid white;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s ease;
}

.match-card:hover .match-user-photo {
  transform: scale(1.05);
}

.match-user-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 5px;
  color: #333;
}

.match-user-info {
  color: #555;
  font-size: 14px;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.match-user-info i {
  font-size: 12px;
  opacity: 0.7;
}

.match-user-location {
  color: #666;
  font-size: 13px;
  margin-bottom: 5px;
  font-style: italic;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.match-user-location i {
  font-size: 12px;
  opacity: 0.7;
}

.match-user-id {
  color: #999;
  font-size: 11px;
  opacity: 0.7;
}

.match-status {
  padding: 12px 15px;
  display: flex;
  justify-content: center;
  background-color: #f5f5f5;
  border-bottom: 1px solid #eee;
}

.match-status-badge {
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.match-status-badge.confirmed {
  background-color: #4CAF50;
  color: white;
}

.match-status-badge.pending {
  background-color: #FFC107;
  color: #333;
}

.match-messages {
  padding: 18px 20px;
  border-bottom: 1px solid #eee;
  background-color: white;
}

.match-messages-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.match-messages-title {
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-messages-count {
  background-color: #ff4b7d;
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 5px rgba(255, 75, 125, 0.2);
}

.match-messages-preview {
  color: #666;
  font-size: 14px;
  line-height: 1.4;
}

.match-actions {
  display: flex;
  padding: 18px 20px;
  gap: 12px;
  background-color: white;
}

.match-action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.match-action-btn.view {
  background-color: #2196F3;
  color: white;
}

.match-action-btn.view:hover {
  background-color: #1976D2;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
}

.match-action-btn.delete {
  background-color: rgba(244, 67, 54, 0.1);
  color: #F44336;
  border: 1px solid rgba(244, 67, 54, 0.2);
}

.match-action-btn.delete:hover {
  background-color: #F44336;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
  border-color: transparent;
}

.match-action-btn i {
  font-size: 16px;
}

/* Match Detail Modal */
.match-detail-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.match-detail-modal.active {
  opacity: 1;
  visibility: visible;
}

.match-detail-content {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  transform: translateY(20px);
  transition: all 0.3s ease;
}

.match-detail-modal.active .match-detail-content {
  transform: translateY(0);
}

.match-detail-header {
  padding: 20px;
  background: linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 10;
}

.match-detail-title {
  font-size: 20px;
  font-weight: 600;
}

.match-detail-close {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.match-detail-close:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: rotate(90deg);
}

.match-detail-body {
  padding: 20px;
}

.match-detail-section {
  margin-bottom: 20px;
}

.match-detail-section-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 15px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.match-detail-section-title i {
  color: #ff4b7d;
}

.match-detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.match-detail-item {
  background-color: #f9f9f9;
  padding: 15px;
  border-radius: 8px;
}

.match-detail-item-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.match-detail-item-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.match-detail-users {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

@media (max-width: 768px) {
  .match-detail-users {
    grid-template-columns: 1fr;
  }
}

.match-detail-user {
  background-color: #f9f9f9;
  border-radius: 10px;
  padding: 20px;
}

.match-detail-user-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.match-detail-user-photo {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 15px;
  border: 3px solid white;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
}

.match-detail-user-info h3 {
  margin: 0 0 5px 0;
  font-size: 18px;
}

.match-detail-user-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.match-detail-user-bio {
  margin-bottom: 15px;
  color: #555;
  font-size: 14px;
  line-height: 1.5;
}

.match-detail-user-interests {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.match-detail-interest {
  background-color: rgba(255, 75, 125, 0.1);
  color: #ff4b7d;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: 500;
}

.match-detail-footer {
  padding: 15px 20px;
  background-color: #f5f5f5;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  border-top: 1px solid #eee;
}

.match-detail-btn {
  padding: 10px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s ease;
}

.match-detail-btn.primary {
  background-color: #ff4b7d;
  color: white;
}

.match-detail-btn.primary:hover {
  background-color: #e91e63;
}

.match-detail-btn.secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.match-detail-btn.secondary:hover {
  background-color: #eee;
}

/* Search and filters */
#matches-section .section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
}

#matches-section .search-container {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

#match-search {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  min-width: 250px;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

#match-search:focus {
  outline: none;
  border-color: #ff4b7d;
  box-shadow: 0 0 0 3px rgba(255, 75, 125, 0.2);
}

#match-search-btn, #refresh-matches {
  padding: 10px 15px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

#match-search-btn:hover, #refresh-matches:hover {
  background-color: #f9f9f9;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

#refresh-matches {
  background-color: #f5f5f5;
  color: #333;
}

#refresh-matches:hover {
  background-color: #eee;
}

/* Empty state */
#matches-empty {
  background-color: white;
  border-radius: 12px;
  padding: 40px 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

#matches-empty i {
  font-size: 60px;
  color: #ff4b7d;
  opacity: 0.5;
  margin-bottom: 20px;
}

#matches-empty p {
  font-size: 18px;
  color: #555;
}

/* Loading state */
#matches-loading {
  background-color: white;
  border-radius: 12px;
  padding: 40px 20px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05);
}

#matches-loading i {
  font-size: 60px;
  color: #ff4b7d;
  margin-bottom: 20px;
}

#matches-loading p {
  font-size: 18px;
  color: #555;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  #matches-grid {
    grid-template-columns: 1fr;
  }
  
  .match-users {
    flex-direction: column;
    gap: 20px;
  }
  
  .match-heart-container {
    margin: 10px 0;
  }
  
  .match-user {
    width: 100%;
  }
  
  .match-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .match-title {
    max-width: 100%;
  }
}
`
      document.head.appendChild(style)
    }

    // Show loading overlay
    showLoadingOverlay()

    // Initialize Firebase if not already initialized
    initializeFirebase()

    // Set a timeout to check if we're stuck loading
    setTimeout(checkIfStuckLoading, 10000)

    // Add this to the init function to ensure the matches section is properly set up
    // Find the init function and add this code inside it, before the console.log("Admin module initialized") line
    if (document.getElementById("matches-section")) {
      // Create the matches section structure if it doesn't exist
      if (!document.getElementById("matches-grid")) {
        const matchesSection = document.getElementById("matches-section")
        matchesSection.innerHTML = `
      <div class="section-header">
        <h2>User Matches</h2>
        <div class="search-container">
          <input type="text" id="match-search" placeholder="Search by user name...">
          <button id="match-search-btn">
            <i class="fas fa-search"></i> Search
          </button>
          <button id="refresh-matches">
            <i class="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>
      
      <div id="matches-loading" class="empty-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading matches...</p>
      </div>
      
      <div id="matches-grid" style="display: none;"></div>
      
      <div id="matches-empty" class="empty-state" style="display: none;">
        <i class="fas fa-heart-broken"></i>
        <p>No matches found</p>
      </div>
    `
      }
    }

    // Add debugging for matches section
    if (document.getElementById("matches-section")) {
      console.log("Matches section found in DOM")
    } else {
      console.error("Matches section not found in DOM")
    }

    // Check if the matches grid exists
    if (document.getElementById("matches-grid")) {
      console.log("Matches grid found in DOM")
    } else {
      console.log("Matches grid not found, will create it")
    }

    console.log("Admin module initialized")
  }

  // Check if we're stuck loading
  const checkIfStuckLoading = () => {
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay && !loadingOverlay.classList.contains("hidden")) {
      console.log("Still loading after 10 seconds, might be stuck")
      // Force show login screen
      hideLoadingOverlay()
      showLoginScreen()
    }
  }

  // Initialize Firebase
  const initializeFirebase = () => {
    try {
      console.log("Initializing Firebase...")

      // Your Firebase config
      const firebaseConfig = {
        apiKey: "AIzaSyAsc5FpnqdJdUXql2jAIPf7-VSLIv4TIv0",
        authDomain: "datingapp-482ac.firebaseapp.com",
        projectId: "datingapp-482ac",
        storageBucket: "datingapp-482ac.appspot.com",
        messagingSenderId: "672058081482",
        appId: "1:672058081482:web:d61e90a5f397eb46e4b433",
        measurementId: "G-F300RLDGVF",
      }

      // Check if Firebase is already initialized
      if (!window.firebase || !window.firebase.apps || window.firebase.apps.length === 0) {
        // Initialize Firebase
        window.firebase.initializeApp(firebaseConfig)
        console.log("Firebase initialized successfully")
      } else {
        console.log("Firebase already initialized")
      }

      // Get Firebase services
      firebase = window.firebase
      auth = firebase.auth()
      db = firebase.firestore()
      storage = firebase.storage()
      functions = firebase.functions()

      // Enable offline persistence for Firestore
      db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
        if (err.code === "failed-precondition") {
          console.warn("Multiple tabs open, persistence can only be enabled in one tab at a time.")
        } else if (err.code === "unimplemented") {
          console.warn("The current browser does not support all of the features required to enable persistence")
        }
      })

      // Set up auth state listener
      auth.onAuthStateChanged(handleAuthStateChanged)

      // Bind events after Firebase is initialized
      bindEvents()
    } catch (error) {
      console.error("Error initializing Firebase:", error)
      showError("Failed to initialize Firebase: " + error.message)
      hideLoadingOverlay()
      showLoginScreen()
    }
  }

  // Handle auth state changes
  const handleAuthStateChanged = (user) => {
    console.log("Auth state changed:", user ? "User logged in" : "User logged out")

    // Clean up any existing listeners
    cleanupListeners()

    if (user) {
      // User is signed in
      currentUser = user
      checkAdminAccess()
    } else {
      // User is signed out
      currentUser = null
      showLoginScreen()
    }
  }

  // Clean up listeners
  const cleanupListeners = () => {
    if (verificationListener) {
      verificationListener()
      verificationListener = null
    }

    if (usersListener) {
      usersListener()
      usersListener = null
    }

    if (dashboardStatsListener) {
      dashboardStatsListener()
      dashboardStatsListener = null
    }
  }

  // Handle admin login
  const handleAdminLogin = () => {
    // Show loading overlay
    showLoadingOverlay()

    // Sign in with popup
    const provider = new firebase.auth.GoogleAuthProvider()

    // Add custom parameters for Google sign-in
    provider.setCustomParameters({
      prompt: "select_account",
    })

    auth
      .signInWithPopup(provider)
      .then((result) => {
        // This gives you a Google Access Token
        const credential = result.credential
        // The signed-in user info
        const user = result.user
        console.log("User signed in:", user.displayName)
      })
      .catch((error) => {
        console.error("Error during sign in:", error)
        showError("Login failed: " + error.message)
        hideLoadingOverlay()
        showLoginScreen()
      })
  }

  // Check if user has admin access
  const checkAdminAccess = async () => {
    try {
      // List of admin UIDs - only these users can access the admin panel
      const adminUIDs = [
        "Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1",
        "U60X51daggVxsyFzJ01u2LBlLyK2",
        "lXnIV6QfuCWJOPJfVxJ9xqvUg2J3",
        "TgxwPG9e8NZZXMlMtNpOlmhDwLA2",
      ]

      // Check if current user is in the admin list
      if (!adminUIDs.includes(currentUser.uid)) {
        console.log("Access denied for user:", currentUser.uid)
        showAccessDenied()
        return
      }

      console.log("Admin access granted for user:", currentUser.uid)

      // Get user data to display admin name and photo
      try {
        const userDoc = await db.collection("users").doc(currentUser.uid).get()

        // Set admin name and photo
        const adminName = document.getElementById("admin-name")
        const adminPhoto = document.getElementById("admin-photo")

        if (adminName) {
          adminName.textContent =
            userDoc.exists && userDoc.data().name ? userDoc.data().name : currentUser.displayName || currentUser.email
        }

        if (adminPhoto) {
          if (userDoc.exists && userDoc.data().photoURL) {
            adminPhoto.style.backgroundImage = `url(${userDoc.data().photoURL})`
            adminPhoto.textContent = ""
          } else if (currentUser.photoURL) {
            adminPhoto.style.backgroundImage = `url(${currentUser.photoURL})`
            adminPhoto.textContent = ""
          } else {
            // Set initials
            const name =
              userDoc.exists && userDoc.data().name ? userDoc.data().name : currentUser.displayName || currentUser.email
            adminPhoto.textContent = name.charAt(0).toUpperCase()
          }
        }
      } catch (error) {
        console.error("Error getting user data:", error)
        // Continue anyway, this is not critical
      }

      // Show admin panel
      showAdminPanel()

      // Load dashboard data
      loadDashboardData()
    } catch (error) {
      console.error("Error checking admin access:", error)
      showError("Error checking admin access: " + error.message)
      showLoginScreen()
    }
  }

  // Show loading overlay
  const showLoadingOverlay = () => {
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay) {
      loadingOverlay.classList.remove("hidden")
    }
  }

  // Hide loading overlay
  const hideLoadingOverlay = () => {
    const loadingOverlay = document.getElementById("loading-overlay")
    if (loadingOverlay) {
      loadingOverlay.classList.add("hidden")
    }
  }

  // Show login screen
  const showLoginScreen = () => {
    hideLoadingOverlay()

    // Hide admin panel and access denied
    const adminPage = document.getElementById("admin-page")
    const accessDenied = document.getElementById("access-denied-container")
    const loginContainer = document.getElementById("admin-login-container")

    if (adminPage) adminPage.classList.add("hidden")
    if (accessDenied) accessDenied.classList.add("hidden")
    if (loginContainer) {
      loginContainer.classList.remove("hidden")

      // Update login container with improved UI
      loginContainer.innerHTML = `
        <div class="admin-login-card">
          <div class="admin-login-header">
            <img src="images/BLK7-logo.png" alt="HeartMatch Logo" class="admin-login-logo">
            <h2>Admin Dashboard</h2>
          </div>
          <div class="admin-login-body">
            <p class="admin-login-message">Please sign in with your Google account to access the HeartMatch admin dashboard.</p>
            <button id="admin-login-btn" class="admin-login-btn">
              <i class="fab fa-google"></i> Sign in with Google
            </button>
          </div>
          <div class="admin-login-footer">
            <p>Need help? <a href="mailto:support@heartmatch.com">Contact Support</a></p>
          </div>
        </div>
      `

      // Rebind login button
      const adminLoginBtn = document.getElementById("admin-login-btn")
      if (adminLoginBtn) {
        adminLoginBtn.addEventListener("click", handleAdminLogin)
      }
    }
  }

  // Show access denied
  const showAccessDenied = () => {
    hideLoadingOverlay()

    // Hide admin panel and login
    const adminPage = document.getElementById("admin-page")
    const loginContainer = document.getElementById("admin-login-container")
    const accessDenied = document.getElementById("access-denied-container")

    if (adminPage) adminPage.classList.add("hidden")
    if (loginContainer) loginContainer.classList.add("hidden")
    if (accessDenied) {
      accessDenied.classList.remove("hidden")

      // Update access denied container with improved UI
      accessDenied.innerHTML = `
        <div class="access-denied-card">
          <div class="access-denied-icon">
            <i class="fas fa-lock"></i>
          </div>
          <h2>Access Denied</h2>
          <p>You don't have permission to access the admin panel. Please contact an administrator if you believe this is an error.</p>
          <button id="back-to-app-btn" class="btn primary-btn">Back to App</button>
          <button id="try-another-account-btn" class="btn secondary-btn">Try Another Account</button>
        </div>
      `

      // Rebind buttons
      const backToAppBtn = document.getElementById("back-to-app-btn")
      if (backToAppBtn) {
        backToAppBtn.addEventListener("click", () => {
          window.location.href = "dashboard.html"
        })
      }

      const tryAnotherAccountBtn = document.getElementById("try-another-account-btn")
      if (tryAnotherAccountBtn) {
        tryAnotherAccountBtn.addEventListener("click", () => {
          auth.signOut().then(() => {
            showLoginScreen()
          })
        })
      }
    }
  }

  // Show admin panel
  const showAdminPanel = () => {
    hideLoadingOverlay()

    // Hide login and access denied
    const loginContainer = document.getElementById("admin-login-container")
    const accessDenied = document.getElementById("access-denied-container")
    const adminPage = document.getElementById("admin-page")

    if (loginContainer) loginContainer.classList.add("hidden")
    if (accessDenied) accessDenied.classList.add("hidden")
    if (adminPage) adminPage.classList.remove("hidden")
  }

  // Show error notification
  const showError = (message) => {
    if (window.utils && window.utils.showNotification) {
      window.utils.showNotification(message, "error")
    } else {
      alert(message)
    }
  }

  // Show success notification
  const showSuccess = (message) => {
    if (window.utils && window.utils.showNotification) {
      window.utils.showNotification(message, "success")
    } else {
      alert(message)
    }
  }

  // Bind events
  const bindEvents = () => {
    // Navigation
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.addEventListener("click", () => {
        const section = item.getAttribute("data-section")
        showSection(section)
      })
    })

    // Logout button
    const logoutBtn = document.getElementById("admin-logout-btn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        auth
          .signOut()
          .then(() => {
            window.location.href = "index.html"
          })
          .catch((error) => {
            console.error("Error signing out:", error)
            showError("Logout failed: " + error.message)
          })
      })
    }

    // Dashboard refresh button
    const refreshDashboard = document.getElementById("refresh-dashboard")
    if (refreshDashboard) {
      refreshDashboard.addEventListener("click", loadDashboardData)
    }

    // Verification filter
    const verificationFilter = document.getElementById("verification-filter")
    if (verificationFilter) {
      verificationFilter.addEventListener("change", () => {
        loadVerificationRequests(verificationFilter.value)
      })
    }

    // Verification refresh button
    const refreshVerification = document.getElementById("refresh-verification")
    if (refreshVerification) {
      refreshVerification.addEventListener("click", () => {
        const filter = document.getElementById("verification-filter").value
        loadVerificationRequests(filter)
      })
    }

    // User search
    const searchBtn = document.getElementById("search-btn")
    if (searchBtn) {
      searchBtn.addEventListener("click", searchUsers)
    }

    // User search input (enter key)
    const userSearch = document.getElementById("user-search")
    if (userSearch) {
      userSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchUsers()
        }
      })
    }

    // Pagination
    const prevPage = document.getElementById("prev-page")
    const nextPage = document.getElementById("next-page")

    if (prevPage) {
      prevPage.addEventListener("click", () => {
        if (currentPage > 1) {
          currentPage--
          renderUsersList()
        }
      })
    }

    if (nextPage) {
      nextPage.addEventListener("click", () => {
        const totalPages = Math.ceil(usersList.length / usersPerPage)
        if (currentPage < totalPages) {
          currentPage++
          renderUsersList()
        }
      })
    }

    // Time range for analytics
    const timeRange = document.getElementById("time-range")
    if (timeRange) {
      timeRange.addEventListener("change", () => {
        loadAnalyticsData(timeRange.value)
      })
    }

    // Save verification settings
    const saveVerificationSettingsBtn = document.getElementById("save-verification-settings")
    if (saveVerificationSettingsBtn) {
      saveVerificationSettingsBtn.addEventListener("click", saveVerificationSettings)
    }

    // Save system settings
    const saveSystemSettingsBtn = document.getElementById("save-system-settings")
    if (saveSystemSettingsBtn) {
      saveSystemSettingsBtn.addEventListener("click", saveSystemSettings)
    }

    // Add admin
    const addAdminBtn = document.getElementById("add-admin")
    if (addAdminBtn) {
      addAdminBtn.addEventListener("click", addAdmin)
    }

    // Bind login button
    const adminLoginBtn = document.getElementById("admin-login-btn")
    if (adminLoginBtn) {
      adminLoginBtn.addEventListener("click", handleAdminLogin)
    }

    // Bind back to app button
    const backToAppBtn = document.getElementById("back-to-app-btn")
    if (backToAppBtn) {
      backToAppBtn.addEventListener("click", () => {
        window.location.href = "dashboard.html"
      })
    }

    // Match search
    const matchSearchBtn = document.getElementById("match-search-btn")
    if (matchSearchBtn) {
      matchSearchBtn.addEventListener("click", searchMatches)
    }

    // Match search input (enter key)
    const matchSearch = document.getElementById("match-search")
    if (matchSearch) {
      matchSearch.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          searchMatches()
        }
      })
    }

    // Refresh matches
    const refreshMatches = document.getElementById("refresh-matches")
    if (refreshMatches) {
      refreshMatches.addEventListener("click", loadMatches)
    }
  }

  // Show section
  const showSection = (section) => {
    // Update current section
    currentSection = section

    // Show loading overlay
    showLoadingOverlay()

    // Update active nav item
    document.querySelectorAll(".nav-item").forEach((item) => {
      if (item.getAttribute("data-section") === section) {
        item.classList.add("active")
      } else {
        item.classList.remove("active")
      }
    })

    // Show/hide sections
    document.querySelectorAll(".content-section").forEach((sectionEl) => {
      if (sectionEl.id === `${section}-section`) {
        sectionEl.classList.remove("hidden")
      } else {
        sectionEl.classList.add("hidden")
      }
    })

    // Load section data
    switch (section) {
      case "dashboard":
        loadDashboardData()
        break
      case "verification":
        loadVerificationRequests("pending")
        break
      case "users":
        loadUsers()
        break
      case "matches":
        loadMatches()
        break
      case "analytics":
        loadAnalyticsData("day")
        break
      case "settings":
        loadSettings()
        break
    }
  }

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      showLoadingOverlay()

      // Show loading state
      document.getElementById("total-users").textContent = "Loading..."
      document.getElementById("active-users").textContent = "Loading..."
      document.getElementById("total-matches").textContent = "Loading..."
      document.getElementById("pending-verification").textContent = "Loading..."

      // Set up real-time listener for dashboard stats
      if (dashboardStatsListener) {
        dashboardStatsListener()
      }

      // Check if user is authenticated
      if (!auth.currentUser) {
        throw new Error("User not authenticated")
      }

      // Get today's date at midnight
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Get yesterday's date at midnight
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      // Add daily stats card to dashboard if it doesn't exist
      const dashboardSection = document.getElementById("dashboard-section")
      const statsContainer = document.getElementById("stats-container")

      if (dashboardSection && !document.getElementById("daily-stats-card")) {
        const dailyStatsCard = document.createElement("div")
        dailyStatsCard.id = "daily-stats-card"
        dailyStatsCard.className = "daily-stats-card"
        dailyStatsCard.innerHTML = `
          <div class="daily-stats-header">
            <h3>Today's Activity</h3>
            <span class="daily-stats-date">${today.toLocaleDateString()}</span>
          </div>
          <div class="daily-stats-grid">
            <div class="daily-stat-item">
              <div class="daily-stat-value" id="today-new-users">-</div>
              <div class="daily-stat-label">New Users</div>
              <div class="daily-stat-trend" id="users-trend"></div>
            </div>
            <div class="daily-stat-item">
              <div class="daily-stat-value" id="today-matches">-</div>
              <div class="daily-stat-label">New Matches</div>
              <div class="daily-stat-trend" id="matches-trend"></div>
            </div>
            <div class="daily-stat-item">
              <div class="daily-stat-value" id="today-messages">-</div>
              <div class="daily-stat-label">Messages Sent</div>
              <div class="daily-stat-trend" id="messages-trend"></div>
            </div>
            <div class="daily-stat-item">
              <div class="daily-stat-value" id="today-verifications">-</div>
              <div class="daily-stat-label">Verification Requests</div>
              <div class="daily-stat-trend" id="verifications-trend"></div>
            </div>
          </div>
        `

        // Insert before the stats container
        dashboardSection.insertBefore(dailyStatsCard, statsContainer)
      }

      // Add error handling for each query
      try {
        // Get counts from Firestore
        const usersSnapshot = await db.collection("users").get()
        const totalUsers = usersSnapshot.size

        // Get active users (active in last 7 days)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

        let activeUsers = 0
        usersSnapshot.forEach((doc) => {
          const userData = doc.data()
          if (userData.lastActive && userData.lastActive.toDate() > sevenDaysAgo) {
            activeUsers++
          }
        })

        // Update stats
        document.getElementById("total-users").textContent = totalUsers
        document.getElementById("active-users").textContent = activeUsers
      } catch (error) {
        console.error("Error fetching user data:", error)
        document.getElementById("total-users").textContent = "Error"
        document.getElementById("active-users").textContent = "Error"
      }

      try {
        // Get matches count
        const matchesSnapshot = await db.collection("matches").get()
        const totalMatches = matchesSnapshot.size
        document.getElementById("total-matches").textContent = totalMatches
      } catch (error) {
        console.error("Error fetching matches data:", error)
        document.getElementById("total-matches").textContent = "Error"
      }

      try {
        // Get pending verification count
        const verificationSnapshot = await db.collection("users").where("verification.status", "==", "pending").get()
        const pendingVerification = verificationSnapshot.size
        document.getElementById("pending-verification").textContent = pendingVerification
        document.getElementById("verification-badge").textContent = pendingVerification
      } catch (error) {
        console.error("Error fetching verification data:", error)
        document.getElementById("pending-verification").textContent = "Error"
        document.getElementById("verification-badge").textContent = "!"
      }

      // Get today's stats
      try {
        // New users today
        const todayUsersSnapshot = await db
          .collection("users")
          .where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(today))
          .get()

        const todayNewUsers = todayUsersSnapshot.size

        // New users yesterday for comparison
        const yesterdayUsersSnapshot = await db
          .collection("users")
          .where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(yesterday))
          .where("createdAt", "<", firebase.firestore.Timestamp.fromDate(today))
          .get()

        const yesterdayNewUsers = yesterdayUsersSnapshot.size

        // Update UI
        document.getElementById("today-new-users").textContent = todayNewUsers

        // Calculate trend
        const usersTrendEl = document.getElementById("users-trend")
        if (usersTrendEl) {
          const diff = todayNewUsers - yesterdayNewUsers
          if (diff > 0) {
            usersTrendEl.className = "daily-stat-trend up"
            usersTrendEl.innerHTML = `<i class="fas fa-arrow-up"></i> ${Math.abs(diff)} from yesterday`
          } else if (diff < 0) {
            usersTrendEl.className = "daily-stat-trend down"
            usersTrendEl.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(diff)} from yesterday`
          } else {
            usersTrendEl.className = "daily-stat-trend"
            usersTrendEl.innerHTML = `<i class="fas fa-equals"></i> Same as yesterday`
          }
        }
      } catch (error) {
        console.error("Error fetching today's user data:", error)
        document.getElementById("today-new-users").textContent = "Error"
      }

      // Get today's matches
      try {
        const todayMatchesSnapshot = await db
          .collection("matches")
          .where("createdAt", ">=", firebase.firestore.Timestamp.fromDate(today))
          .get()

        document.getElementById("today-matches").textContent = todayMatchesSnapshot.size
      } catch (error) {
        console.error("Error fetching today's matches data:", error)
        document.getElementById("today-matches").textContent = "Error"
      }

      // Get today's verification requests
      try {
        const todayVerificationsSnapshot = await db
          .collection("users")
          .where("verification.timestamp", ">=", firebase.firestore.Timestamp.fromDate(today))
          .get()

        document.getElementById("today-verifications").textContent = todayVerificationsSnapshot.size
      } catch (error) {
        console.error("Error fetching today's verification data:", error)
        document.getElementById("today-verifications").textContent = "Error"
      }

      // Update last updated time
      const lastUpdated = document.getElementById("last-updated")
      if (lastUpdated) {
        const now = new Date()
        lastUpdated.textContent = `Last updated: ${now.toLocaleTimeString()}`
      }

      hideLoadingOverlay()

      // Load charts with error handling
      try {
        loadUserGrowthChart()
      } catch (error) {
        console.error("Error loading user growth chart:", error)
      }

      try {
        loadResponseTimeChart()
      } catch (error) {
        console.error("Error loading response time chart:", error)
      }

      try {
        loadSystemHealthData()
      } catch (error) {
        console.error("Error loading system health data:", error)
      }

      // Set up real-time listener for pending verifications with error handling
      try {
        dashboardStatsListener = db
          .collection("users")
          .where("verification.status", "==", "pending")
          .onSnapshot(
            (snapshot) => {
              const pendingCount = snapshot.size
              document.getElementById("pending-verification").textContent = pendingCount
              document.getElementById("verification-badge").textContent = pendingCount
            },
            (error) => {
              console.error("Error in verification listener:", error)
              document.getElementById("pending-verification").textContent = "Error"
              document.getElementById("verification-badge").textContent = "!"
            },
          )
      } catch (error) {
        console.error("Error setting up verification listener:", error)
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
      hideLoadingOverlay()

      // Show error notification but don't block the UI
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading some dashboard data: " + error.message, "warning")
      }

      // Set error states for counters
      document.getElementById("total-users").textContent = "Error"
      document.getElementById("active-users").textContent = "Error"
      document.getElementById("total-matches").textContent = "Error"
      document.getElementById("pending-verification").textContent = "Error"
    }
  }

  // Load user growth chart
  const loadUserGrowthChart = async () => {
    try {
      // Get user creation dates
      const usersSnapshot = await db.collection("users").get()

      // Group by month
      const usersByMonth = {}

      usersSnapshot.forEach((doc) => {
        const userData = doc.data()
        if (userData.createdAt) {
          const date = userData.createdAt.toDate()
          const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`

          if (!usersByMonth[monthYear]) {
            usersByMonth[monthYear] = 0
          }

          usersByMonth[monthYear]++
        }
      })

      // Convert to arrays for Chart.js
      const months = Object.keys(usersByMonth).sort((a, b) => {
        const [aMonth, aYear] = a.split("/")
        const [bMonth, bYear] = b.split("/")

        if (aYear !== bYear) {
          return aYear - bYear
        }

        return aMonth - bMonth
      })

      const counts = months.map((month) => usersByMonth[month])

      // Calculate cumulative counts
      const cumulativeCounts = []
      let total = 0

      for (const count of counts) {
        total += count
        cumulativeCounts.push(total)
      }

      // Create chart
      const ctx = document.getElementById("user-growth-chart")
      if (!ctx) {
        console.error("User growth chart canvas not found")
        return
      }

      const context = ctx.getContext("2d")

      if (window.userGrowthChart) {
        window.userGrowthChart.destroy()
      }

      window.userGrowthChart = new Chart(context, {
        type: "line",
        data: {
          labels: months,
          datasets: [
            {
              label: "New Users",
              data: counts,
              backgroundColor: "rgba(33, 150, 243, 0.2)",
              borderColor: "rgba(33, 150, 243, 1)",
              borderWidth: 2,
              tension: 0.4,
            },
            {
              label: "Total Users",
              data: cumulativeCounts,
              backgroundColor: "rgba(255, 75, 125, 0.2)",
              borderColor: "rgba(255, 75, 125, 1)",
              borderWidth: 2,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      })
    } catch (error) {
      console.error("Error loading user growth chart:", error)

      // Show error message in chart container
      const chartContainer = document.getElementById("user-growth-chart").parentNode
      if (chartContainer) {
        chartContainer.innerHTML = `
          <div class="chart-error">
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading chart: ${error.message}</p>
          </div>
        `
      }
    }
  }

  // Load response time chart
  const loadResponseTimeChart = () => {
    try {
      // Generate sample data for now
      // In a real app, this would come from monitoring tools
      const labels = []
      const data = []

      for (let i = 0; i < 24; i++) {
        labels.push(`${i}:00`)
        // Random response time between 50-200ms
        data.push(Math.floor(Math.random() * 150) + 50)
      }

      // Create chart
      const ctx = document.getElementById("response-time-chart")
      if (!ctx) {
        console.error("Response time chart canvas not found")
        return
      }

      const context = ctx.getContext("2d")

      if (window.responseTimeChart) {
        window.responseTimeChart.destroy()
      }

      window.responseTimeChart = new Chart(context, {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "Response Time (ms)",
              data: data,
              backgroundColor: "rgba(126, 87, 194, 0.2)",
              borderColor: "rgba(126, 87, 194, 1)",
              borderWidth: 2,
              tension: 0.4,
              fill: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
        },
      })
    } catch (error) {
      console.error("Error loading response time chart:", error)
    }
  }

  // Load system health data
  const loadSystemHealthData = () => {
    try {
      // Generate sample data for now
      // In a real app, this would come from monitoring tools
      const apiResponseTime = Math.floor(Math.random() * 100) + 50
      const dbLatency = Math.floor(Math.random() * 50) + 20
      const storagePerformance = Math.floor(Math.random() * 200) + 100
      const authDelay = Math.floor(Math.random() * 80) + 40

      // Update UI
      const apiResponseTimeEl = document.getElementById("api-response-time")
      const dbLatencyEl = document.getElementById("db-latency")
      const storagePerformanceEl = document.getElementById("storage-performance")
      const authDelayEl = document.getElementById("auth-delay")

      if (apiResponseTimeEl) apiResponseTimeEl.textContent = `${apiResponseTime} ms`
      if (dbLatencyEl) dbLatencyEl.textContent = `${dbLatency} ms`
      if (storagePerformanceEl) storagePerformanceEl.textContent = `${storagePerformance} ms`
      if (authDelayEl) authDelayEl.textContent = `${authDelay} ms`

      // Update status indicators
      updateStatusIndicator("api-status", apiResponseTime, 100, 200)
      updateStatusIndicator("db-status", dbLatency, 50, 100)
      updateStatusIndicator("storage-status", storagePerformance, 200, 300)
      updateStatusIndicator("auth-status", authDelay, 80, 150)
    } catch (error) {
      console.error("Error loading system health data:", error)
    }
  }

  // Update status indicator
  const updateStatusIndicator = (elementId, value, warningThreshold, criticalThreshold) => {
    const element = document.getElementById(elementId)
    if (!element) return

    const indicator = element.querySelector(".status-indicator")
    if (!indicator) return

    let status = "good"
    let text = "Good"

    if (value >= criticalThreshold) {
      status = "critical"
      text = "Critical"
    } else if (value >= warningThreshold) {
      status = "warning"
      text = "Warning"
    }

    indicator.className = `status-indicator ${status}`
    element.innerHTML = `<span class="status-indicator ${status}"></span> ${text}`
  }

  // Load verification requests
  const loadVerificationRequests = async (status = "pending") => {
    try {
      showLoadingOverlay()

      // Get the verification section
      const verificationSection = document.getElementById("verification-section")
      if (!verificationSection) {
        hideLoadingOverlay()
        return
      }

      // Create improved UI for verification section
      verificationSection.innerHTML = `
        <div class="section-header">
          <h2>Verification Requests</h2>
          <div class="verification-filter-container">
            <div class="verification-filter-label">Status:</div>
            <select id="verification-filter" class="verification-filter-select">
              <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
              <option value="verified" ${status === "verified" ? "selected" : ""}>Approved</option>
              <option value="rejected" ${status === "rejected" ? "selected" : ""}>Rejected</option>
              <option value="all">All</option>
            </select>
            <div class="verification-search">
              <i class="fas fa-search"></i>
              <input type="text" id="verification-search" placeholder="Search by name or email...">
            </div>
            <button id="refresh-verification" class="verification-refresh-btn">
              <i class="fas fa-sync-alt"></i> Refresh
            </button>
          </div>
        </div>
        
        <div id="verification-loading" class="empty-state">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Loading verification requests...</p>
        </div>
        
        <div id="verification-container" class="verification-card-container" style="display: none;"></div>
        
        <div id="verification-empty" class="empty-state" style="display: none;">
          <i class="fas fa-user-check"></i>
          <p>No ${status} verification requests found</p>
        </div>
        
        <div id="verification-detail-view" class="verification-detail-view" style="display: none;"></div>
      `

      // Rebind events for the new elements
      const verificationFilter = document.getElementById("verification-filter")
      if (verificationFilter) {
        verificationFilter.addEventListener("change", () => {
          loadVerificationRequests(verificationFilter.value)
        })
      }

      const refreshVerification = document.getElementById("refresh-verification")
      if (refreshVerification) {
        refreshVerification.addEventListener("click", () => {
          const filter = document.getElementById("verification-filter").value
          loadVerificationRequests(filter)
        })
      }

      const verificationSearch = document.getElementById("verification-search")
      if (verificationSearch) {
        verificationSearch.addEventListener("keyup", filterVerificationRequests)
        verificationSearch.addEventListener("search", filterVerificationRequests)
      }

      // Clean up existing listener
      if (verificationListener) {
        verificationListener()
        verificationListener = null
      }

      // Set up query based on status
      let query = db.collection("users")

      if (status !== "all") {
        query = query.where("verification.status", "==", status)
      }

      // Set up real-time listener
      verificationListener = query.onSnapshot(
        async (snapshot) => {
          // Process results
          verificationRequests = []

          snapshot.forEach((doc) => {
            const userData = doc.data()

            if (userData.verification) {
              verificationRequests.push({
                id: doc.id,
                name: userData.name || "Unknown User",
                email: userData.email || "",
                phone: userData.phone || "",
                photoURL: userData.photoURL || "",
                age: userData.age || "",
                gender: userData.gender || "",
                bio: userData.bio || "",
                verification: userData.verification,
              })
            }
          })

          // Sort by timestamp (newest first)
          verificationRequests.sort((a, b) => {
            const aTime = a.verification.timestamp ? a.verification.timestamp.toDate() : new Date(0)
            const bTime = b.verification.timestamp ? b.verification.timestamp.toDate() : new Date(0)

            return bTime - aTime
          })

          hideLoadingOverlay()

          // Hide loading state
          document.getElementById("verification-loading").style.display = "none"

          // Show empty state or render verification cards
          if (verificationRequests.length === 0) {
            document.getElementById("verification-empty").style.display = "flex"
            document.getElementById("verification-container").style.display = "none"
          } else {
            document.getElementById("verification-empty").style.display = "none"
            document.getElementById("verification-container").style.display = "grid"
            renderVerificationCards()
          }
        },
        (error) => {
          console.error("Error in verification listener:", error)
          hideLoadingOverlay()

          // Show error state
          document.getElementById("verification-loading").innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <p>Error loading verification requests: ${error.message}</p>
          `
        },
      )
    } catch (error) {
      console.error("Error setting up verification listener:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading verification requests: " + error.message, "error")
      }
    }
  }

  // Filter verification requests
  const filterVerificationRequests = () => {
    const searchInput = document.getElementById("verification-search")
    if (!searchInput) return

    const searchTerm = searchInput.value.toLowerCase().trim()

    // Get all verification cards
    const cards = document.querySelectorAll(".verification-card")

    cards.forEach((card) => {
      const name = card.querySelector(".user-name")?.textContent.toLowerCase() || ""
      const email = card.querySelector(".user-email")?.textContent.toLowerCase() || ""

      if (name.includes(searchTerm) || email.includes(searchTerm) || searchTerm === "") {
        card.style.display = "block"
      } else {
        card.style.display = "none"
      }
    })

    // Check if any cards are visible
    const visibleCards = document.querySelectorAll(".verification-card[style='display: block']")

    if (visibleCards.length === 0 && searchTerm !== "") {
      // Show no results message
      const container = document.getElementById("verification-container")

      // Check if no results message already exists
      if (!document.getElementById("no-results-message")) {
        const noResults = document.createElement("div")
        noResults.id = "no-results-message"
        noResults.className = "empty-state"
        noResults.innerHTML = `
          <i class="fas fa-search"></i>
          <p>No results found for "${searchTerm}"</p>
        `
        container.appendChild(noResults)
      }
    } else {
      // Remove no results message if it exists
      const noResults = document.getElementById("no-results-message")
      if (noResults) {
        noResults.remove()
      }
    }
  }

  // Render verification cards
  const renderVerificationCards = () => {
    const container = document.getElementById("verification-container")
    if (!container) return

    container.innerHTML = ""

    verificationRequests.forEach((request) => {
      const card = document.createElement("div")
      card.className = "verification-card"
      card.setAttribute("data-id", request.id)

      // Format timestamp
      const timestamp = request.verification.timestamp
        ? request.verification.timestamp.toDate().toLocaleString()
        : "Unknown"

      // Create card HTML with improved UI
      card.innerHTML = `
        <div class="verification-user-info">
          <img src="${request.photoURL || "images/default-avatar.png"}" alt="${request.name}" class="user-avatar" onerror="this.src='images/default-avatar.png'">
          <div class="user-details">
            <h4 class="user-name">${request.name}</h4>
            <p class="user-email">${request.email}</p>
            <p class="user-phone">${request.phone || "No phone"}</p>
          </div>
        </div>
        <div class="verification-photo-container">
          <img src="${request.verification.photoURL || "images/verification-pose.png"}" alt="Verification photo" class="verification-photo" onerror="this.src='images/verification-pose.png'">
          <div class="verification-status-badge ${request.verification.status}">${request.verification.status}</div>
          <div class="verification-timestamp">${timestamp}</div>
        </div>
        <div class="verification-actions">
          <button class="approve-btn" data-id="${request.id}" ${request.verification.status !== "pending" ? "disabled" : ""}>
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="reject-btn" data-id="${request.id}" ${request.verification.status !== "pending" ? "disabled" : ""}>
            <i class="fas fa-times"></i> Reject
          </button>
        </div>
      `

      // Add event listener to the card
      card.addEventListener("click", (e) => {
        // Don't trigger if clicking on a button
        if (e.target.tagName === "BUTTON" || e.target.parentElement.tagName === "BUTTON") {
          return
        }

        showVerificationDetail(request.id)
      })

      // Add event listeners to buttons
      const approveBtn = card.querySelector(".approve-btn")
      const rejectBtn = card.querySelector(".reject-btn")

      if (approveBtn) {
        approveBtn.addEventListener("click", (e) => {
          e.stopPropagation() // Prevent card click
          handleVerificationAction(request.id, "verified")
        })
      }

      if (rejectBtn) {
        rejectBtn.addEventListener("click", (e) => {
          e.stopPropagation() // Prevent card click
          if (
            confirm(`Are you sure you want to reject ${request.name}'s verification? This will DELETE their account.`)
          ) {
            handleVerificationAction(request.id, "rejected")
          }
        })
      }

      container.appendChild(card)
    })
  }

  // Show verification detail
  const showVerificationDetail = (id) => {
    // Find the verification request
    const request = verificationRequests.find((r) => r.id === id)
    if (!request) return

    // Get the detail view container
    const detailView = document.getElementById("verification-detail-view")
    if (!detailView) return

    // Format timestamp
    const timestamp = request.verification.timestamp
      ? request.verification.timestamp.toDate().toLocaleString()
      : "Unknown"

    // Create detail view HTML with improved UI
    detailView.innerHTML = `
      <div class="verification-detail-header">
        <div class="verification-detail-user">
          <img src="${request.photoURL || "images/default-avatar.png"}" alt="${request.name}" class="verification-detail-photo" onerror="this.src='images/default-avatar.png'">
          <div class="verification-detail-info">
            <h3>${request.name}</h3>
            <p>ID: ${request.id}</p>
            <p>Email: ${request.email}</p>
            <p>Phone: ${request.phone || "No phone"}</p>
          </div>
        </div>
        <div class="verification-detail-status ${request.verification.status}">
          ${request.verification.status}
        </div>
      </div>
      
      <div class="verification-detail-content">
        <div class="user-additional-info">
          <p><strong>Age:</strong> ${request.age || "Not specified"}</p>
          <p><strong>Gender:</strong> ${request.gender || "Not specified"}</p>
          <p><strong>Submitted:</strong> ${timestamp}</p>
          <p><strong>Bio:</strong> ${request.bio || "No bio"}</p>
        </div>
        
        <div class="verification-photos">
          <div class="verification-photo-card">
            <img src="${request.verification.photoURL || "images/verification-pose.png"}" alt="Verification photo" onerror="this.src='images/verification-pose.png'">
            <div class="verification-photo-label">Verification Photo</div>
          </div>
          <div class="verification-photo-card">
            <img src="${request.photoURL || "images/default-avatar.png"}" alt="Profile photo" onerror="this.src='images/default-avatar.png'">
            <div class="verification-photo-label">Profile Photo</div>
          </div>
        </div>
      </div>
      
      <div class="verification-detail-actions">
        <button class="approve-btn" id="detail-approve-btn" data-id="${request.id}" ${request.verification.status !== "pending" ? "disabled" : ""}>
          <i class="fas fa-check"></i> Approve Verification
        </button>
        <button class="reject-btn" id="detail-reject-btn" data-id="${request.id}" ${request.verification.status !== "pending" ? "disabled" : ""}>
          <i class="fas fa-times"></i> Reject & Delete Account
        </button>
        <button class="close-btn" id="detail-close-btn">
          <i class="fas fa-arrow-left"></i> Back to List
        </button>
      </div>
    `

    // Add event listeners to buttons
    const approveBtn = document.getElementById("detail-approve-btn")
    const rejectBtn = document.getElementById("detail-reject-btn")
    const closeBtn = document.getElementById("detail-close-btn")

    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        handleVerificationAction(request.id, "verified")
      })
    }

    if (rejectBtn) {
      rejectBtn.addEventListener("click", () => {
        if (
          confirm(`Are you sure you want to reject ${request.name}'s verification? This will DELETE their account.`)
        ) {
          handleVerificationAction(request.id, "rejected")
        }
      })
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        detailView.style.display = "none"
      })
    }

    // Show the detail view
    detailView.style.display = "block"

    // Scroll to the detail view
    detailView.scrollIntoView({ behavior: "smooth" })
  }

  // Handle verification action (approve or reject)
  const handleVerificationAction = async (userId, status) => {
    try {
      showLoadingOverlay()

      // Get user data
      const userDoc = await db.collection("users").doc(userId).get()

      if (!userDoc.exists) {
        showError("User not found")
        hideLoadingOverlay()
        return
      }

      const userData = userDoc.data()
      const userName = userData.name || "Unknown User"
      const photoURL = userData.verification?.photoURL

      if (status === "verified") {
        // Approve the user
        await db.collection("users").doc(userId).update({
          "verification.status": status,
          "verification.reviewedAt": firebase.firestore.FieldValue.serverTimestamp(),
          "verification.reviewedBy": auth.currentUser.uid,
          verified: true,
        })

        showSuccess(`Verification for ${userName} approved successfully!`)
      } else if (status === "rejected") {
        // Log the rejection in a separate collection for audit purposes
        await db
          .collection("rejectedUsers")
          .doc(userId)
          .set({
            ...userData,
            rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
            rejectedBy: auth.currentUser.uid,
            originalId: userId,
          })

        // Delete the user document
        await db.collection("users").doc(userId).delete()

        showSuccess(`User ${userName} rejected and account deleted!`)
      }

      // Delete verification photo from storage
      if (photoURL && storage) {
        try {
          const storageRef = storage.refFromURL(photoURL)
          await storageRef.delete()
          console.log(`Verification photo deleted: ${photoURL}`)
        } catch (deleteError) {
          console.error("Error deleting verification photo:", deleteError)
          // Continue anyway, this is not critical
        }
      }

      // Hide detail view if open
      const detailView = document.getElementById("verification-detail-view")
      if (detailView) {
        detailView.style.display = "none"
      }

      // Reload verification requests
      const filter = document.getElementById("verification-filter").value
      loadVerificationRequests(filter)

      // Reload dashboard data
      loadDashboardData()

      hideLoadingOverlay()
    } catch (error) {
      console.error(`Error ${status === "verified" ? "approving" : "rejecting"} verification:`, error)
      hideLoadingOverlay()

      showError(`Error ${status === "verified" ? "approving" : "rejecting"} verification: ${error.message}`)
    }
  }

  // Load users
  const loadUsers = async () => {
    try {
      showLoadingOverlay()

      // Show loading state
      const usersTableBody = document.getElementById("users-table-body")
      if (usersTableBody) {
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">Loading users...</td>
          </tr>
        `
      }

      // Clean up existing listener
      if (usersListener) {
        usersListener()
        usersListener = null
      }

      // Set up real-time listener
      usersListener = db.collection("users").onSnapshot(
        (snapshot) => {
          // Process results
          usersList = []

          snapshot.forEach((doc) => {
            const userData = doc.data()

            usersList.push({
              id: doc.id,
              name: userData.name || "Unknown User",
              email: userData.email || "",
              photoURL: userData.photoURL || "",
              createdAt: userData.createdAt,
              lastActive: userData.lastActive,
              status: userData.status || "active",
              verified: userData.verification && userData.verification.status === "verified",
            })
          })

          // Sort by creation date (newest first)
          usersList.sort((a, b) => {
            const aTime = a.createdAt ? a.createdAt.toDate() : new Date(0)
            const bTime = b.createdAt ? b.createdAt.toDate() : new Date(0)

            return bTime - aTime
          })

          hideLoadingOverlay()

          // Render users
          renderUsersList()
        },
        (error) => {
          console.error("Error in users listener:", error)
          hideLoadingOverlay()

          if (window.utils && window.utils.showNotification) {
            window.utils.showNotification("Error loading users: " + error.message, "error")
          }

          // Show error state
          const usersTableBody = document.getElementById("users-table-body")
          if (usersTableBody) {
            usersTableBody.innerHTML = `
              <tr>
                <td colspan="7" class="text-center">Error loading users. Please try again.</td>
              </tr>
            `
          }
        },
      )
    } catch (error) {
      console.error("Error setting up users listener:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading users: " + error.message, "error")
      }

      // Show error state
      const usersTableBody = document.getElementById("users-table-body")
      if (usersTableBody) {
        usersTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center">Error loading users. Please try again.</td>
          </tr>
        `
      }
    }
  }

  // Load matches
  const loadMatches = async () => {
    try {
      showLoadingOverlay()

      // Show loading state
      document.getElementById("matches-loading").style.display = "flex"
      document.getElementById("matches-grid").style.display = "none"
      document.getElementById("matches-empty").style.display = "none"

      console.log("Starting to load matches...")

      // Get matches from Firestore
      const matchesSnapshot = await db.collection("matches").orderBy("timestamp", "desc").get()

      // Check if there are any matches
      if (matchesSnapshot.empty) {
        console.log("No matches found in the database")
        document.getElementById("matches-loading").style.display = "none"
        document.getElementById("matches-empty").style.display = "flex"
        document.getElementById("matches-empty").innerHTML = `
        <i class="fas fa-heart-broken"></i>
        <p>No matches found in the database</p>
      `
        hideLoadingOverlay()
        return
      }

      console.log(`Found ${matchesSnapshot.size} matches in the database`)

      // Process matches
      const matchesData = []
      const matchPromises = []

      matchesSnapshot.forEach((doc) => {
        const matchData = doc.data()
        console.log(`Processing match ${doc.id}:`, matchData)

        // Check if the match has the expected structure
        if (!matchData.users || !Array.isArray(matchData.users) || matchData.users.length < 2) {
          console.warn(`Match ${doc.id} has invalid structure:`, matchData)
          return // Skip this match
        }

        // Get user data for both users in the match
        const user1Promise = db.collection("users").doc(matchData.users[0]).get()
        const user2Promise = db.collection("users").doc(matchData.users[1]).get()

        // Get message count - assuming messages are stored in a 'messages' subcollection
        const messagesPromise = db
          .collection("messages")
          .where("matchId", "==", doc.id)
          .get()
          .then((snapshot) => snapshot.size)
          .catch(() => {
            // If there's an error, try to estimate from unreadCount if available
            if (matchData.unreadCount) {
              const totalUnread = Object.values(matchData.unreadCount).reduce((sum, count) => sum + count, 0)
              return totalUnread > 0 ? totalUnread : 0
            }
            return 0
          })

        // Add all promises to the array
        matchPromises.push(
          Promise.all([user1Promise, user2Promise, messagesPromise])
            .then(([user1Doc, user2Doc, messageCount]) => {
              const user1Data = user1Doc.exists ? user1Doc.data() : { displayName: "Unknown User" }
              const user2Data = user2Doc.exists ? user2Doc.data() : { displayName: "Unknown User" }

              console.log(`User 1 data for match ${doc.id}:`, user1Data)
              console.log(`User 2 data for match ${doc.id}:`, user2Data)

              // Calculate age from birthDate
              const calculateAge = (birthDateStr) => {
                if (!birthDateStr) return ""
                const birthDate = new Date(birthDateStr)
                const today = new Date()
                let age = today.getFullYear() - birthDate.getFullYear()
                const monthDiff = today.getMonth() - birthDate.getMonth()
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                  age--
                }
                return age
              }

              matchesData.push({
                id: doc.id,
                user1: {
                  id: matchData.users[0],
                  name: user1Data.displayName || "Unknown User",
                  photoURL: user1Data.photos && user1Data.photos.length > 0 ? user1Data.photos[0] : "",
                  age: calculateAge(user1Data.birthDate),
                  gender: user1Data.gender || "",
                  location: user1Data.location || "",
                  bio: user1Data.bio || "",
                  interests: user1Data.interests || [],
                },
                user2: {
                  id: matchData.users[1],
                  name: user2Data.displayName || "Unknown User",
                  photoURL: user2Data.photos && user2Data.photos.length > 0 ? user2Data.photos[0] : "",
                  age: calculateAge(user2Data.birthDate),
                  gender: user2Data.gender || "",
                  location: user2Data.location || "",
                  bio: user2Data.bio || "",
                  interests: user2Data.interests || [],
                },
                createdAt: matchData.timestamp || null,
                lastMessageAt: matchData.lastMessageTimestamp || null,
                confirmed: matchData.confirmed || false,
                messageCount: messageCount,
              })
            })
            .catch((error) => {
              console.error(`Error processing match ${doc.id}:`, error)
            }),
        )
      })

      // Wait for all promises to resolve
      await Promise.all(matchPromises)

      console.log(`Successfully processed ${matchesData.length} matches`)

      // Sort matches by creation date (newest first)
      matchesData.sort((a, b) => {
        const aTime = a.createdAt ? a.createdAt.toDate() : new Date(0)
        const bTime = b.createdAt ? b.createdAt.toDate() : new Date(0)
        return bTime - aTime
      })

      // Render matches
      renderMatches(matchesData)

      // Hide loading overlay
      hideLoadingOverlay()
    } catch (error) {
      console.error("Error loading matches:", error)

      // Show error state
      document.getElementById("matches-loading").innerHTML = `
      <i class="fas fa-exclamation-circle"></i>
      <p>Error loading matches: ${error.message}</p>
    `

      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading matches: " + error.message, "error")
      }
    }
  }

  // Render matches
  const renderMatches = (matchesData) => {
    const matchesGrid = document.getElementById("matches-grid")
    if (!matchesGrid) return

    // Clear existing content
    matchesGrid.innerHTML = ""

    if (matchesData.length === 0) {
      document.getElementById("matches-loading").style.display = "none"
      document.getElementById("matches-empty").style.display = "flex"
      return
    }

    console.log(`Rendering ${matchesData.length} matches`)

    // Hide loading and empty states
    document.getElementById("matches-loading").style.display = "none"
    document.getElementById("matches-empty").style.display = "none"

    // Show matches grid
    matchesGrid.style.display = "grid"

    // Add filter controls if they don't exist
    if (!document.querySelector(".matches-controls")) {
      const sectionHeader = document.querySelector("#matches-section .section-header")
      const searchContainer = document.querySelector("#matches-section .search-container")

      if (sectionHeader && searchContainer) {
        const controlsDiv = document.createElement("div")
        controlsDiv.className = "matches-controls"
        controlsDiv.innerHTML = `
        <div class="matches-filter">
          <div class="matches-filter-label">Status:</div>
          <select id="match-status-filter" class="matches-filter-select">
            <option value="all">All Matches</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        <div class="matches-filter">
          <div class="matches-filter-label">Sort by:</div>
          <select id="match-sort-filter" class="matches-filter-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="messages">Most Messages</option>
          </select>
        </div>
      `

        // Insert after section header
        sectionHeader.parentNode.insertBefore(controlsDiv, sectionHeader.nextSibling)

        // Add event listeners to filters
        document.getElementById("match-status-filter").addEventListener("change", filterMatches)
        document.getElementById("match-sort-filter").addEventListener("change", sortMatches)
      }
    }

    // Create a modal container for match details if it doesn't exist
    if (!document.getElementById("match-detail-modal")) {
      const modalDiv = document.createElement("div")
      modalDiv.id = "match-detail-modal"
      modalDiv.className = "match-detail-modal"
      modalDiv.innerHTML = `
      <div class="match-detail-content">
        <div class="match-detail-header">
          <div class="match-detail-title">Match Details</div>
          <button class="match-detail-close"><i class="fas fa-times"></i></button>
        </div>
        <div class="match-detail-body">
          <!-- Content will be dynamically inserted here -->
        </div>
      </div>
    `
      document.body.appendChild(modalDiv)

      // Add event listener to close button
      document.querySelector(".match-detail-close").addEventListener("click", () => {
        document.getElementById("match-detail-modal").classList.remove("active")
      })

      // Close modal when clicking outside content
      document.getElementById("match-detail-modal").addEventListener("click", (e) => {
        if (e.target === document.getElementById("match-detail-modal")) {
          document.getElementById("match-detail-modal").classList.remove("active")
        }
      })
    }

    // Render each match
    matchesData.forEach((match) => {
      const matchCard = document.createElement("div")
      matchCard.className = "match-card"
      matchCard.setAttribute("data-id", match.id)
      matchCard.setAttribute("data-status", match.confirmed ? "confirmed" : "pending")
      matchCard.setAttribute("data-messages", match.messageCount)
      matchCard.setAttribute("data-created", match.createdAt ? match.createdAt.toDate().getTime() : 0)

      // Format timestamp
      const timestamp = match.createdAt ? match.createdAt.toDate().toLocaleString() : "Unknown"
      const lastMessageTime = match.lastMessageAt ? match.lastMessageAt.toDate().toLocaleString() : "No messages yet"

      // Format match title
      const matchTitle = `${match.user1.name} and ${match.user2.name} are a match!`

      // Format interests as comma-separated list
      const formatInterests = (interests) => {
        if (!interests || interests.length === 0) return "None"
        return interests.join(", ")
      }

      // Create match card HTML
      matchCard.innerHTML = `
      <div class="match-header">
        <div class="match-title">${matchTitle}</div>
        <div class="match-timestamp"><i class="far fa-clock"></i> ${timestamp}</div>
      </div>
      <div class="match-users">
        <div class="match-user">
          <div class="match-user-photo-container">
            <img src="${match.user1.photoURL || "images/default-avatar.png"}" alt="${match.user1.name}" class="match-user-photo" onerror="this.src='images/default-avatar.png'">
          </div>
          <div class="match-user-name">${match.user1.name}</div>
          <div class="match-user-info"><i class="fas fa-user"></i> ${match.user1.age ? match.user1.age + " years" : ""} ${match.user1.gender || ""}</div>
          <div class="match-user-location"><i class="fas fa-map-marker-alt"></i> ${match.user1.location || "Unknown location"}</div>
          <div class="match-user-id">ID: ${match.user1.id}</div>
        </div>
        <div class="match-heart-container">
          <div class="match-heart-bg"></div>
          <div class="match-heart">
            <i class="fas fa-heart"></i>
          </div>
        </div>
        <div class="match-user">
          <div class="match-user-photo-container">
            <img src="${match.user2.photoURL || "images/default-avatar.png"}" alt="${match.user2.name}" class="match-user-photo" onerror="this.src='images/default-avatar.png'">
          </div>
          <div class="match-user-name">${match.user2.name}</div>
          <div class="match-user-info"><i class="fas fa-user"></i> ${match.user2.age ? match.user2.age + " years" : ""} ${match.user2.gender || ""}</div>
          <div class="match-user-location"><i class="fas fa-map-marker-alt"></i> ${match.user2.location || "Unknown location"}</div>
          <div class="match-user-id">ID: ${match.user2.id}</div>
        </div>
      </div>
      <div class="match-status">
        <div class="match-status-badge ${match.confirmed ? "confirmed" : "pending"}">
          <i class="fas ${match.confirmed ? "fa-check-circle" : "fa-clock"}"></i>
          ${match.confirmed ? "Confirmed Match" : "Pending Confirmation"}
        </div>
      </div>
      <div class="match-messages">
        <div class="match-messages-header">
          <div class="match-messages-title"><i class="far fa-comment-dots"></i> Messages</div>
          <div class="match-messages-count">${match.messageCount}</div>
        </div>
        <div class="match-messages-preview">
          ${
            match.messageCount > 0
              ? `${match.messageCount} messages exchanged<br><small>Last message: ${lastMessageTime}</small>`
              : "No messages yet"
          }
        </div>
      </div>
      <div class="match-actions">
        <button class="match-action-btn view" data-id="${match.id}" data-user1="${match.user1.id}" data-user2="${match.user2.id}">
          <i class="fas fa-eye"></i> View Details
        </button>
        <button class="match-action-btn delete" data-id="${match.id}">
          <i class="fas fa-trash"></i> Delete Match
        </button>
      </div>
    `

      // Add event listeners to buttons
      const viewBtn = matchCard.querySelector(".match-action-btn.view")
      const deleteBtn = matchCard.querySelector(".match-action-btn.delete")

      if (viewBtn) {
        viewBtn.addEventListener("click", () => {
          // Show match details in modal
          showMatchDetailModal(match)
        })
      }

      if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
          if (
            confirm(`Are you sure you want to delete the match between ${match.user1.name} and ${match.user2.name}?`)
          ) {
            deleteMatch(match.id)
          }
        })
      }

      matchesGrid.appendChild(matchCard)
    })
  }

  // Show match detail modal
  const showMatchDetailModal = (match) => {
    const modal = document.getElementById("match-detail-modal")
    const modalBody = modal.querySelector(".match-detail-body")

    // Format timestamp
    const timestamp = match.createdAt ? match.createdAt.toDate().toLocaleString() : "Unknown"
    const lastMessageTime = match.lastMessageAt ? match.lastMessageAt.toDate().toLocaleString() : "No messages yet"

    // Format interests as comma-separated list
    const formatInterests = (interests) => {
      if (!interests || interests.length === 0) return []
      return interests
    }

    // Create interests HTML
    const createInterestsHTML = (interests) => {
      return formatInterests(interests)
        .map((interest) => `<div class="match-detail-interest">${interest}</div>`)
        .join("")
    }

    // Set modal content
    modalBody.innerHTML = `
    <div class="match-detail-section">
      <div class="match-detail-section-title"><i class="fas fa-info-circle"></i> Match Information</div>
      <div class="match-detail-grid">
        <div class="match-detail-item">
          <div class="match-detail-item-label">Created</div>
          <div class="match-detail-item-value">${timestamp}</div>
        </div>
        <div class="match-detail-item">
          <div class="match-detail-item-label">Status</div>
          <div class="match-detail-item-value">${match.confirmed ? "Confirmed" : "Pending"}</div>
        </div>
        <div class="match-detail-item">
          <div class="match-detail-item-label">Messages</div>
          <div class="match-detail-item-value">${match.messageCount}</div>
        </div>
        <div class="match-detail-item">
          <div class="match-detail-item-label">Last Message</div>
          <div class="match-detail-item-value">${lastMessageTime}</div>
        </div>
      </div>
    </div>
    
    <div class="match-detail-section">
      <div class="match-detail-section-title"><i class="fas fa-users"></i> User Profiles</div>
      <div class="match-detail-users">
        <div class="match-detail-user">
          <div class="match-detail-user-header">
            <img src="${match.user1.photoURL || "images/default-avatar.png"}" alt="${match.user1.name}" class="match-detail-user-photo" onerror="this.src='images/default-avatar.png'">
            <div class="match-detail-user-info">
              <h3>${match.user1.name}</h3>
              <p>${match.user1.age ? match.user1.age + " years" : ""} ${match.user1.gender || ""}</p>
              <p>${match.user1.location || ""}</p>
            </div>
          </div>
          <div class="match-detail-user-bio">
            ${match.user1.bio || "No bio available"}
          </div>
          <div class="match-detail-user-interests">
            ${createInterestsHTML(match.user1.interests)}
          </div>
        </div>
        <div class="match-detail-user">
          <div class="match-detail-user-header">
            <img src="${match.user2.photoURL || "images/default-avatar.png"}" alt="${match.user2.name}" class="match-detail-user-photo" onerror="this.src='images/default-avatar.png'">
            <div class="match-detail-user-info">
              <h3>${match.user2.name}</h3>
              <p>${match.user2.age ? match.user2.age + " years" : ""} ${match.user2.gender || ""}</p>
              <p>${match.user2.location || ""}</p>
            </div>
          </div>
          <div class="match-detail-user-bio">
            ${match.user2.bio || "No bio available"}
          </div>
          <div class="match-detail-user-interests">
            ${createInterestsHTML(match.user2.interests)}
          </div>
        </div>
      </div>
    </div>
  `

    // Show modal
    modal.classList.add("active")
  }

  // Filter matches based on status
  const filterMatches = () => {
    const statusFilter = document.getElementById("match-status-filter").value
    const cards = document.querySelectorAll(".match-card")

    cards.forEach((card) => {
      const status = card.getAttribute("data-status")

      if (statusFilter === "all" || status === statusFilter) {
        card.style.display = "block"
      } else {
        card.style.display = "none"
      }
    })

    // Check if any cards are visible
    checkVisibleCards()
  }

  // Sort matches
  const sortMatches = () => {
    const sortFilter = document.getElementById("match-sort-filter").value
    const matchesGrid = document.getElementById("matches-grid")
    const cards = Array.from(document.querySelectorAll(".match-card"))

    // Sort cards based on selected filter
    cards.sort((a, b) => {
      if (sortFilter === "newest") {
        return Number.parseInt(b.getAttribute("data-created")) - Number.parseInt(a.getAttribute("data-created"))
      } else if (sortFilter === "oldest") {
        return Number.parseInt(a.getAttribute("data-created")) - Number.parseInt(b.getAttribute("data-created"))
      } else if (sortFilter === "messages") {
        return Number.parseInt(b.getAttribute("data-messages")) - Number.parseInt(a.getAttribute("data-messages"))
      }
      return 0
    })

    // Re-append cards in sorted order
    cards.forEach((card) => {
      matchesGrid.appendChild(card)
    })
  }

  // Check if any cards are visible after filtering
  const checkVisibleCards = () => {
    const visibleCards = document.querySelectorAll('.match-card[style="display: block"]')
    const emptyState = document.getElementById("matches-empty")

    if (visibleCards.length === 0) {
      emptyState.style.display = "flex"
      emptyState.innerHTML = `
      <i class="fas fa-filter"></i>
      <p>No matches found with the selected filters</p>
    `
    } else {
      emptyState.style.display = "none"
    }
  }

  // Search matches
  const searchMatches = () => {
    const searchInput = document.getElementById("match-search")
    if (!searchInput) return

    const searchTerm = searchInput.value.toLowerCase().trim()

    // Get all match cards
    const cards = document.querySelectorAll(".match-card")

    let hasVisibleCards = false

    cards.forEach((card) => {
      const user1Name = card.querySelector(".match-user:nth-child(1) .match-user-name").textContent.toLowerCase()
      const user2Name = card.querySelector(".match-user:nth-child(3) .match-user-name").textContent.toLowerCase()
      const user1Location = card
        .querySelector(".match-user:nth-child(1) .match-user-location")
        .textContent.toLowerCase()
      const user2Location = card
        .querySelector(".match-user:nth-child(3) .match-user-location")
        .textContent.toLowerCase()

      if (
        user1Name.includes(searchTerm) ||
        user2Name.includes(searchTerm) ||
        user1Location.includes(searchTerm) ||
        user2Location.includes(searchTerm) ||
        searchTerm === ""
      ) {
        card.style.display = "block"
        hasVisibleCards = true
      } else {
        card.style.display = "none"
      }
    })

    // Show/hide empty state based on search results
    const emptyState = document.getElementById("matches-empty")
    if (emptyState) {
      if (!hasVisibleCards && searchTerm !== "") {
        emptyState.style.display = "flex"
        emptyState.innerHTML = `
        <i class="fas fa-search"></i>
        <p>No matches found for "${searchTerm}"</p>
      `
      } else {
        emptyState.style.display = "none"
      }
    }
  }

  // Delete match
  const deleteMatch = async (matchId) => {
    try {
      showLoadingOverlay()

      // Delete match document
      await db.collection("matches").doc(matchId).delete()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Match deleted successfully", "success")
      }

      // Reload matches
      loadMatches()
    } catch (error) {
      console.error("Error deleting match:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error deleting match: " + error.message, "error")
      }
    }
  }

  // Render users list
  const renderUsersList = () => {
    const usersTableBody = document.getElementById("users-table-body")
    if (!usersTableBody) return

    if (usersList.length === 0) {
      usersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center">No users found</td>
        </tr>
      `
      return
    }

    // Calculate pagination
    const totalPages = Math.ceil(usersList.length / usersPerPage)
    const startIndex = (currentPage - 1) * usersPerPage
    const endIndex = Math.min(startIndex + usersPerPage, usersList.length)
    const currentUsers = usersList.slice(startIndex, endIndex)

    // Update pagination controls
    const prevPageBtn = document.getElementById("prev-page")
    const nextPageBtn = document.getElementById("next-page")
    const pageInfo = document.getElementById("page-info")

    if (prevPageBtn) {
      prevPageBtn.disabled = currentPage === 1
    }

    if (nextPageBtn) {
      nextPageBtn.disabled = currentPage === totalPages
    }

    if (pageInfo) {
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`
    }

    // Render users
    let html = ""

    currentUsers.forEach((user) => {
      const createdAt = user.createdAt ? user.createdAt.toDate().toLocaleDateString() : "Unknown"

      html += `
        <tr>
          <td>${user.id}</td>
          <td>
            <div style="display: flex; align-items: center;">
              <img src="${user.photoURL || "images/default-avatar.png"}" alt="${user.name}" style="width: 30px; height: 30px; border-radius: 50%; margin-right: 10px;" onerror="this.src='images/default-avatar.png'">
              ${user.name}
            </div>
          </td>
          <td>${user.email}</td>
          <td>${createdAt}</td>
          <td><span class="user-status ${user.status}">${user.status}</span></td>
          <td>${user.verified ? '<i class="fas fa-check-circle"></i>' : ""}</td>
          <td class="user-actions">
            <button class="user-action-btn" data-action="view" data-id="${user.id}">
              <i class="fas fa-eye"></i>
            </button>
            <button class="user-action-btn" data-action="edit" data-id="${user.id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="user-action-btn" data-action="delete" data-id="${user.id}">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>
      `
    })

    usersTableBody.innerHTML = html

    // Add click events to action buttons
    document.querySelectorAll(".user-action-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action")
        const id = btn.getAttribute("data-id")

        handleUserAction(action, id)
      })
    })
  }

  // Handle user action
  const handleUserAction = (action, id) => {
    // Find user
    const user = usersList.find((u) => u.id === id)
    if (!user) return

    switch (action) {
      case "view":
        // In a real app, this would open a modal or navigate to user detail page
        alert(`View user: ${user.name}`)
        break
      case "edit":
        // In a real app, this would open a modal or navigate to user edit page
        alert(`Edit user: ${user.name}`)
        break
      case "delete":
        // Confirm deletion
        if (confirm(`Are you sure you want to delete user ${user.name}?`)) {
          deleteUser(id)
        }
        break
    }
  }

  // Delete user
  const deleteUser = async (id) => {
    try {
      // Delete user document
      await db.collection("users").doc(id).delete()

      // Show notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("User deleted successfully", "success")
      }

      // Remove from list
      usersList = usersList.filter((u) => u.id !== id)

      // Re-render list
      renderUsersList()

      // Reload dashboard data
      loadDashboardData()
    } catch (error) {
      console.error("Error deleting user:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error deleting user", "error")
      }
    }
  }

  // Search users
  const searchUsers = () => {
    const searchInput = document.getElementById("user-search")
    if (!searchInput) return

    const query = searchInput.value.toLowerCase().trim()

    if (query === "") {
      // Reset to original list
      loadUsers()
      return
    }

    // Filter users
    const filteredUsers = usersList.filter((user) => {
      return (
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
      )
    })

    // Update list
    usersList = filteredUsers

    // Reset pagination
    currentPage = 1

    // Render filtered list
    renderUsersList()
  }

  // Load analytics data
  const loadAnalyticsData = (timeRange) => {
    try {
      showLoadingOverlay()

      // In a real app, this would fetch data from a monitoring service
      // For this demo, we'll generate random data

      // Generate sample data
      generatePerformanceData(timeRange)

      // Update metrics
      updatePerformanceMetrics()

      // Render charts
      renderResponseTrendChart(timeRange)
      renderEndpointPerformanceChart()
      renderErrorDistributionChart()
      renderUserActivityChart(timeRange)

      // Hide loading overlay when all charts are rendered
      hideLoadingOverlay()
    } catch (error) {
      console.error("Error loading analytics data:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading analytics data: " + error.message, "error")
      }
    }
  }

  // Generate performance data
  const generatePerformanceData = (timeRange) => {
    // Clear existing data
    performanceData = {
      responseTime: [],
      apiCalls: [],
      errorRate: [],
      labels: [],
    }

    // Generate data based on time range
    let dataPoints = 24
    let labelFormat = "HH:mm"

    if (timeRange === "week") {
      dataPoints = 7
      labelFormat = "ddd"
    } else if (timeRange === "month") {
      dataPoints = 30
      labelFormat = "MMM D"
    }

    // Generate labels
    const labels = []
    const now = new Date()

    for (let i = 0; i < dataPoints; i++) {
      const date = new Date()

      if (timeRange === "day") {
        date.setHours(now.getHours() - (dataPoints - 1) + i)
        labels.push(`${date.getHours()}:00`)
      } else if (timeRange === "week") {
        date.setDate(now.getDate() - (dataPoints - 1) + i)
        labels.push(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()])
      } else if (timeRange === "month") {
        date.setDate(now.getDate() - (dataPoints - 1) + i)
        labels.push(`${date.getMonth() + 1}/${date.getDate()}`)
      }
    }

    // Generate data
    for (let i = 0; i < dataPoints; i++) {
      // Response time: 50-200ms with some spikes
      let responseTime = Math.floor(Math.random() * 100) + 50

      // Add occasional spikes
      if (Math.random() < 0.1) {
        responseTime += Math.floor(Math.random() * 300)
      }

      // API calls: 100-500 per hour/day
      const apiCalls = Math.floor(Math.random() * 400) + 100

      // Error rate: 0-5%
      const errorRate = Math.random() * 5

      performanceData.responseTime.push(responseTime)
      performanceData.apiCalls.push(apiCalls)
      performanceData.errorRate.push(errorRate)
    }

    // Add labels
    performanceData.labels = labels
  }

  // Update performance metrics
  const updatePerformanceMetrics = () => {
    // Calculate averages
    const avgResponseTime =
      performanceData.responseTime.reduce((sum, val) => sum + val, 0) / performanceData.responseTime.length
    const peakResponseTime = Math.max(...performanceData.responseTime)
    const avgApiCalls = performanceData.apiCalls.reduce((sum, val) => sum + val, 0) / performanceData.apiCalls.length
    const avgErrorRate = performanceData.errorRate.reduce((sum, val) => sum + val, 0) / performanceData.errorRate.length

    // Update UI
    document.getElementById("avg-response-time").textContent = `${Math.round(avgResponseTime)} ms`
    document.getElementById("peak-response-time").textContent = `${peakResponseTime} ms`
    document.getElementById("api-calls").textContent = Math.round(avgApiCalls)
    document.getElementById("error-rate").textContent = `${avgErrorRate.toFixed(2)}%`
  }

  // Render response trend chart
  const renderResponseTrendChart = (timeRange) => {
    const ctx = document.getElementById("response-trend-chart")
    if (!ctx) {
      console.error("Response trend chart canvas not found")
      return
    }

    const context = ctx.getContext("2d")

    if (window.responseTrendChart) {
      window.responseTrendChart.destroy()
    }

    window.responseTrendChart = new Chart(context, {
      type: "line",
      data: {
        labels: performanceData.labels,
        datasets: [
          {
            label: "Response Time (ms)",
            data: performanceData.responseTime,
            backgroundColor: "rgba(255, 75, 125, 0.2)",
            borderColor: "rgba(255, 75, 125, 1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Response Time (ms)",
            },
          },
          x: {
            title: {
              display: true,
              text: timeRange === "day" ? "Hour" : timeRange === "week" ? "Day" : "Date",
            },
          },
        },
      },
    })
  }

  // Render endpoint performance chart
  const renderEndpointPerformanceChart = () => {
    const ctx = document.getElementById("endpoint-performance-chart")
    if (!ctx) {
      console.error("Endpoint performance chart canvas not found")
      return
    }

    const context = ctx.getContext("2d")

    if (window.endpointPerformanceChart) {
      window.endpointPerformanceChart.destroy()
    }

    // Sample data for endpoints
    const endpoints = ["User Profile", "Authentication", "Matches", "Messages", "Discover"]

    const responseTimes = endpoints.map(() => Math.floor(Math.random() * 150) + 50)

    window.endpointPerformanceChart = new Chart(context, {
      type: "bar",
      data: {
        labels: endpoints,
        datasets: [
          {
            label: "Avg. Response Time (ms)",
            data: responseTimes,
            backgroundColor: [
              "rgba(255, 75, 125, 0.7)",
              "rgba(126, 87, 194, 0.7)",
              "rgba(33, 150, 243, 0.7)",
              "rgba(76, 175, 80, 0.7)",
              "rgba(255, 152, 0, 0.7)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Response Time (ms)",
            },
          },
        },
      },
    })
  }

  // Render error distribution chart
  const renderErrorDistributionChart = () => {
    const ctx = document.getElementById("error-distribution-chart")
    if (!ctx) {
      console.error("Error distribution chart canvas not found")
      return
    }

    const context = ctx.getContext("2d")

    if (window.errorDistributionChart) {
      window.errorDistributionChart.destroy()
    }

    // Sample data for error types
    const errorTypes = ["Authentication", "Database", "Storage", "Network", "Client"]

    const errorCounts = errorTypes.map(() => Math.floor(Math.random() * 50))

    window.errorDistributionChart = new Chart(context, {
      type: "doughnut",
      data: {
        labels: errorTypes,
        datasets: [
          {
            data: errorCounts,
            backgroundColor: [
              "rgba(244, 67, 54, 0.7)",
              "rgba(255, 152, 0, 0.7)",
              "rgba(255, 235, 59, 0.7)",
              "rgba(33, 150, 243, 0.7)",
              "rgba(158, 158, 158, 0.7)",
            ],
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
          },
        },
      },
    })
  }

  // Render user activity chart
  const renderUserActivityChart = (timeRange) => {
    const ctx = document.getElementById("user-activity-chart")
    if (!ctx) {
      console.error("User activity chart canvas not found")
      return
    }

    const context = ctx.getContext("2d")

    if (window.userActivityChart) {
      window.userActivityChart.destroy()
    }

    // Generate sample data
    const activeUsers = performanceData.labels.map(() => Math.floor(Math.random() * 100) + 50)
    const newMatches = performanceData.labels.map(() => Math.floor(Math.random() * 30) + 5)
    const messages = performanceData.labels.map(() => Math.floor(Math.random() * 200) + 100)

    window.userActivityChart = new Chart(context, {
      type: "line",
      data: {
        labels: performanceData.labels,
        datasets: [
          {
            label: "Active Users",
            data: activeUsers,
            backgroundColor: "rgba(33, 150, 243, 0.2)",
            borderColor: "rgba(33, 150, 243, 1)",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "New Matches",
            data: newMatches,
            backgroundColor: "rgba(255, 75, 125, 0.2)",
            borderColor: "rgba(255, 75, 125, 1)",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y1",
          },
          {
            label: "Messages Sent",
            data: messages,
            backgroundColor: "rgba(76, 175, 80, 0.2)",
            borderColor: "rgba(76, 175, 80, 1)",
            borderWidth: 2,
            tension: 0.4,
            yAxisID: "y2",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            position: "left",
            title: {
              display: true,
              text: "Active Users",
            },
          },
          y1: {
            beginAtZero: true,
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: "New Matches",
            },
          },
          y2: {
            beginAtZero: true,
            position: "right",
            grid: {
              drawOnChartArea: false,
            },
            title: {
              display: true,
              text: "Messages",
            },
            display: false,
          },
          x: {
            title: {
              display: true,
              text: timeRange === "day" ? "Hour" : timeRange === "week" ? "Day" : "Date",
            },
          },
        },
      },
    })
  }

  // Load settings
  const loadSettings = async () => {
    try {
      showLoadingOverlay()

      // Load verification settings
      const verificationSettings = await db.collection("settings").doc("verification").get()

      if (verificationSettings.exists) {
        const data = verificationSettings.data()
        document.getElementById("auto-approve").checked = data.autoApprove || false
        document.getElementById("verification-expiry").value = data.expiryDays || 90
      } else {
        // Default values
        document.getElementById("auto-approve").checked = false
        document.getElementById("verification-expiry").value = 90
      }

      // Load system settings
      const systemSettings = await db.collection("settings").doc("system").get()

      if (systemSettings.exists) {
        const data = systemSettings.data()
        document.getElementById("maintenance-mode").checked = data.maintenanceMode || false
        document.getElementById("analytics-retention").value = data.analyticsRetentionDays || 30
      } else {
        // Default values
        document.getElementById("maintenance-mode").checked = false
        document.getElementById("analytics-retention").value = 30
      }

      // Load admin users
      await loadAdminUsers()

      hideLoadingOverlay()
    } catch (error) {
      console.error("Error loading settings:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading settings: " + error.message, "error")
      }
    }
  }

  // Load admin users
  const loadAdminUsers = async () => {
    try {
      // Hardcoded admin UIDs
      const adminUIDs = [
        "Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1",
        "U60X51daggVxsyFzJ01u2LBlLyK2",
        "lXnIV6QfuCWJOPJfVxJ9xqvUg2J3",
        "TgxwPG9e8NZZXMlMtNpOlmhDwLA2",
      ]

      const adminList = document.getElementById("admin-list")
      if (!adminList) return

      // Get user data for each admin
      const adminUsers = []
      for (const adminId of adminUIDs) {
        const userDoc = await db.collection("users").doc(adminId).get()
        if (userDoc.exists) {
          adminUsers.push({
            id: adminId,
            email: userDoc.data().email || "Unknown",
            name: userDoc.data().name || "Unknown User",
          })
        }
      }

      if (adminUsers.length === 0) {
        adminList.innerHTML = "<li>No admin users found</li>"
        return
      }

      let html = ""

      adminUsers.forEach((admin) => {
        html += `
          <li>
            <span>${admin.email || admin.name || admin.id}</span>
            <button class="remove-admin" data-id="${admin.id}" disabled title="Admin removal is disabled">
              <i class="fas fa-lock"></i>
            </button>
          </li>
        `
      })

      adminList.innerHTML = html
    } catch (error) {
      console.error("Error loading admin users:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error loading admin users: " + error.message, "error")
      }
    }
  }

  // Add admin
  const addAdmin = async () => {
    try {
      const emailInput = document.getElementById("admin-email")
      if (!emailInput) return

      const email = emailInput.value.trim()

      if (!email) {
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("Please enter an email address", "error")
        }
        return
      }

      // Find user by email
      const snapshot = await db.collection("users").where("email", "==", email).get()

      if (snapshot.empty) {
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("User not found with that email", "error")
        }
        return
      }

      // Get first matching user
      const userDoc = snapshot.docs[0]
      const userId = userDoc.id

      // List of admin UIDs - only these users can be admins
      const adminUIDs = [
        "Dhx2L7VTO1ZeF4Ry2y2nX4cmLMo1",
        "U60X51daggVxsyFzJ01u2LBlLyK2",
        "lXnIV6QfuCWJOPJfVxJ9xqvUg2J3",
        "TgxwPG9e8NZZXMlMtNpOlmhDwLA2",
      ]

      // Check if user is already in the admin list
      if (adminUIDs.includes(userId)) {
        if (window.utils && window.utils.showNotification) {
          window.utils.showNotification("User is already an admin", "info")
        }
        return
      }

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Cannot add new admins. Admin list is restricted.", "error")
      }

      // Clear input
      emailInput.value = ""
    } catch (error) {
      console.error("Error adding admin:", error)

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error adding admin: " + error.message, "error")
      }
    }
  }

  // Save verification settings
  const saveVerificationSettings = async () => {
    try {
      showLoadingOverlay()

      const autoApprove = document.getElementById("auto-approve").checked
      const verificationExpiry = Number.parseInt(document.getElementById("verification-expiry").value)

      // Validate input
      if (isNaN(verificationExpiry) || verificationExpiry < 0 || verificationExpiry > 365) {
        showError("Please enter a valid expiration period (0-365 days)")
        hideLoadingOverlay()
        return
      }

      // Save settings to Firestore
      await db.collection("settings").doc("verification").set({
        autoApprove: autoApprove,
        expiryDays: verificationExpiry,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser.uid,
      })

      hideLoadingOverlay()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Verification settings saved successfully", "success")
      }
    } catch (error) {
      console.error("Error saving verification settings:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error saving verification settings: " + error.message, "error")
      }
    }
  }

  // Save system settings
  const saveSystemSettings = async () => {
    try {
      showLoadingOverlay()

      const maintenanceMode = document.getElementById("maintenance-mode").checked
      const analyticsRetention = Number.parseInt(document.getElementById("analytics-retention").value)

      // Validate input
      if (isNaN(analyticsRetention) || analyticsRetention < 1 || analyticsRetention > 365) {
        showError("Please enter a valid retention period (1-365 days)")
        hideLoadingOverlay()
        return
      }

      // Save settings to Firestore
      await db.collection("settings").doc("system").set({
        maintenanceMode: maintenanceMode,
        analyticsRetentionDays: analyticsRetention,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: auth.currentUser.uid,
      })

      hideLoadingOverlay()

      // Show success notification
      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("System settings saved successfully", "success")
      }
    } catch (error) {
      console.error("Error saving system settings:", error)
      hideLoadingOverlay()

      if (window.utils && window.utils.showNotification) {
        window.utils.showNotification("Error saving system settings: " + error.message, "error")
      }
    }
  }

  // Expose module
  window.adminModule = {
    init,
    loadDashboardData,
    loadVerificationRequests,
    loadUsers,
    loadMatches,
    loadAnalyticsData,
    loadSettings,
  }

  return {
    init,
    loadDashboardData,
    loadVerificationRequests,
    loadUsers,
    loadMatches,
    loadAnalyticsData,
    loadSettings,
  }
})()

// Initialize on load
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing admin module")
  if (window.adminModule) {
    adminModule.init()
  }
})
