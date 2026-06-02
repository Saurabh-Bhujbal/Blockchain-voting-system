function getBackendUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const backendParam = urlParams.get('backend');
  if (backendParam) {
    localStorage.setItem('backendUrl', backendParam);
  }
  const saved = localStorage.getItem('backendUrl');
  if (saved) return saved.replace(/\/$/, "");
  // ── PRODUCTION: Use deployed Render backend ──
  return "https://blockchain-voting-system-2-hkad.onrender.com";
} 

function getVoterIdFromToken() {
  let auth = new URLSearchParams(window.location.search).get('Authorization');
  if (!auth) {
    const localToken = localStorage.getItem('jwtTokenVoter') || localStorage.getItem('jwtTokenAdmin');
    if (localToken) auth = 'Bearer ' + localToken;
  }
  if (!auth) return null;
  const token = auth.replace('Bearer ', '').trim();
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload).voter_id;
  } catch (e) {
    return null;
  }
}

window.App = {
  voterId: null,
  currentElectionId: null,

  eventStart: async function() { 
    try {
      App.voterId = getVoterIdFromToken();
      if (App.voterId) {
        $("#accountAddress").html("Your Voter ID: " + App.voterId);
      }
      
      const path = window.location.pathname;
      const isAdmin = path.includes("admin.html") || path.includes("addCandidate.html") || path.includes("viewResults.html");

      // Bind events
      App.bindEvents();

      // Setup UI based on page
      if (path.includes("addCandidate.html")) {
        await App.loadElectionsDropdown('electionSelector');
      } else if (path.includes("viewResults.html")) {
        await App.loadElectionsDropdown('resultsElectionSelector');
      } else if (path.includes("voterResults.html")) {
        const urlParams = new URLSearchParams(window.location.search);
        const electionId = urlParams.get('electionId');
        if (electionId) {
          App.currentElectionId = electionId;
          const res = await fetch(`${getBackendUrl()}/blockchain/election/${electionId}`);
          const electionData = await res.json();
          $("#electionNameDisplay").text(electionData.name);
          await App.loadCandidates(electionId);
        }
      } else if (path.includes("index.html") || path === "/") {
        if (!isAdmin && $("#voteCountHeader").length) {
          $("#voteCountHeader").hide();
        }
        await App.loadElectionsGrid();
      }

    } catch (err) {
      console.error("ERROR in App initialization: " + err.message);
    }
  },

  bindEvents: function() {
    // Add Candidate Event
    $('#addCandidate').click(async function() {
      try {
        if (!App.currentElectionId) {
          alert("Please select an election first.");
          return;
        }
        var nameCandidate = $('#name').val().trim();
        var partyCandidate = $('#party').val().trim();
        
        if (!nameCandidate || !partyCandidate) {
          alert("Please enter both candidate name and party.");
          return;
        }

        const logoInput = document.getElementById('partyLogo');
        const logoFile = logoInput ? logoInput.files[0] : null;
        if (!logoFile) {
          alert("Please select a party logo.");
          return;
        }

        console.log("Adding candidate:", nameCandidate, "to election:", App.currentElectionId);
        
        $('.btn-submit-content').hide();
        $('.btn-submit-loader').show();

        // 1. Submit the blockchain transaction via backend API
        const txRes = await fetch(`${getBackendUrl()}/blockchain/add-candidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            electionId: parseInt(App.currentElectionId),
            name: nameCandidate,
            party: partyCandidate
          })
        });
        
        if (!txRes.ok) {
          const err = await txRes.json();
          throw new Error(err.detail || "Failed to add candidate on blockchain");
        }
        console.log("Blockchain transaction successful");

        // 2. Upload the logo to the dynamic backend host
        const formData = new FormData();
        formData.append('candidateName', nameCandidate);
        formData.append('logo', logoFile);

        try {
          const res = await fetch(`${getBackendUrl()}/upload-logo`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          console.log('Logo upload response:', data);
        } catch (uploadErr) {
          console.error("Logo upload failed, but transaction was confirmed:", uploadErr);
        }

        // 3. Display success status message
        const showStatusFn = window.showStatus;
        if (typeof showStatusFn === 'function') {
          showStatusFn('addMsg', 'success', 'Successfully added the candidate!');
        } else {
          const el = document.getElementById('addMsg');
          if (el) {
            el.className = 'status-msg status-success';
            el.innerHTML = `<i class="fa-solid fa-circle-check"></i> Successfully added the candidate!`;
            el.style.display = 'flex';
          }
        }

        // Reset form inputs
        $('#name').val('');
        $('#party').val('');
        if (typeof window.removeLogo === 'function') {
          window.removeLogo();
        } else {
          const fileInput = document.getElementById('partyLogo');
          if (fileInput) fileInput.value = '';
          const preview = document.getElementById('logoPreview');
          if (preview) preview.style.display = 'none';
          const dropZoneEl = document.getElementById('dropZone');
          if (dropZoneEl) dropZoneEl.style.display = 'block';
        }

        // Clear loader
        $('.btn-submit-content').show();
        $('.btn-submit-loader').hide();

        // 4. Close modal and reload candidates list after a short delay
        setTimeout(() => {
          if (typeof window.closeAllModals === 'function') {
            window.closeAllModals();
          }
          App.loadCandidates(App.currentElectionId);
        }, 2000);

      } catch (err) {
        console.error("Add Candidate error:", err);
        alert("Error adding candidate: " + err.message);
        $('.btn-submit-content').show();
        $('.btn-submit-loader').hide();
      }
    });

    // Add Election Event
    $('#addDate').click(async function() {
      try {
        var electionName = $('#electionName').val();
        if (!electionName) {
          alert("Election title is required.");
          return;
        }
        var startDate = Date.parse(document.getElementById("startDate").value) / 1000;
        var endDate = (Date.parse(document.getElementById("endDate").value) / 1000) + 86399; // Add 23:59:59 to include the whole day
        
        if (isNaN(startDate) || isNaN(endDate)) {
          alert("Valid start and end dates are required.");
          return;
        }

        console.log("Adding election:", electionName);
        const res = await fetch(`${getBackendUrl()}/blockchain/add-election`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: electionName,
            startDate: startDate,
            endDate: endDate
          })
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Failed to add election");
        }
        
        console.log("Election added successfully");
        window.location.reload();
      } catch (err) {
        console.error("Set Dates error:", err);
        alert("Error setting dates: " + err.message);
      }
    });

    // Election Selector Change Event
    $(document).on('change', '#electionSelector', async function() {
      App.currentElectionId = $(this).val();
      if (App.currentElectionId) {
        const res = await fetch(`${getBackendUrl()}/blockchain/election/${App.currentElectionId}`);
        const data = await res.json();
        const endDate = data.endDate * 1000; // convert to ms
        const now = Date.now();
        const electionEnded = now > endDate;

        $('#noElectionPrompt').hide();
        $('#candidateArea').show();

        if (electionEnded) {
          $('.btn-register-candidate').prop('disabled', true).attr('title', 'Election has ended. Cannot register new candidates.');
          $('#electionEndedNotice').show();
        } else {
          $('.btn-register-candidate').prop('disabled', false).attr('title', '');
          $('#electionEndedNotice').hide();
        }

        await App.loadCandidates(App.currentElectionId);
      } else {
        $('#candidateArea').hide();
        $('#noElectionPrompt').show();
        $("#boxCandidate").empty();
      }
    });

    // Results page dropdown
    $(document).on('change', '#resultsElectionSelector', async function() {
      App.currentElectionId = $(this).val();
      if (App.currentElectionId) {
        await App.loadCandidates(App.currentElectionId);
      } else {
        $("#boxCandidate").empty();
      }
    });
  },

  loadElectionsDropdown: async function(dropdownId) {
    const res = await fetch(`${getBackendUrl()}/blockchain/elections-count`);
    const { count } = await res.json();
    const $select = $(`#${dropdownId}`);
    $select.empty();
    
    if (count == 0) {
      $select.append('<option value="">No elections available</option>');
      return;
    }

    $select.append('<option value="" disabled selected>-- Select an Election --</option>');
    for (let i = 1; i <= count; i++) {
      const eRes = await fetch(`${getBackendUrl()}/blockchain/election/${i}`);
      const data = await eRes.json();
      $select.append(`<option value="${data.id}">${data.name}</option>`);
    }
  },

  loadElectionsGrid: async function() {
    const res = await fetch(`${getBackendUrl()}/blockchain/elections-count`);
    const { count } = await res.json();
    const $grid = $("#electionsGrid");
    const $pastGrid = $("#pastElectionsGrid");
    $grid.empty();
    $pastGrid.empty();

    let activeCount = 0;
    let pastCount = 0;

    for (let i = 1; i <= count; i++) {
      const eRes = await fetch(`${getBackendUrl()}/blockchain/election/${i}`);
      const data = await eRes.json();
      const id = data.id;
      const name = data.name;
      const endDateMs = data.endDate * 1000;
      const start = new Date(data.startDate * 1000).toDateString();
      const end = new Date(endDateMs).toDateString();
      
      const isPast = Date.now() > endDateMs;

      if (isPast) {
        pastCount++;
        const html = `
          <div class="election-card card" onclick="App.goToVoterResults(${id})">
            <h3>${name}</h3>
            <p>Dates: ${start} - ${end}</p>
            <button class="btn btn-outline mt-16" style="width:100%; border: 1px solid var(--gold); color: var(--gold);"><i class="fa-solid fa-chart-simple"></i> View Results</button>
          </div>
        `;
        $pastGrid.append(html);
      } else {
        activeCount++;
        const html = `
          <div class="election-card card" onclick="App.selectElectionForVoting(${id}, '${name}')">
            <h3>${name}</h3>
            <p>Dates: ${start} - ${end}</p>
            <button class="btn btn-primary mt-16" style="width:100%">View Candidates</button>
          </div>
        `;
        $grid.append(html);
      }
    }

    if (activeCount === 0) $grid.html('<p style="color:var(--text-muted);">No active elections are currently available.</p>');
    if (pastCount === 0) $pastGrid.html('<p style="color:var(--text-muted);">No past elections are available.</p>');
  },

  goToVoterResults: function(electionId) {
    const token = localStorage.getItem('jwtTokenVoter');
    if (!token) {
      alert('Session expired. Please log in again.');
      window.location.href = '/voterLogin.html';
      return;
    }
    const encodedToken = encodeURIComponent('Bearer ' + token);
    window.location.href = `/voterResults.html?electionId=${electionId}&Authorization=${encodedToken}`;
  },

  selectElectionForVoting: async function(electionId, electionName) {
    App.currentElectionId = electionId;
    $("#selectedElectionName").text(electionName);
    $("#electionsView").hide();
    $("#votingView").show();
    
    // Fetch dates
    const res = await fetch(`${getBackendUrl()}/blockchain/election/${electionId}`);
    const data = await res.json();
    const start = new Date(data.startDate * 1000).toDateString();
    const end = new Date(data.endDate * 1000).toDateString();
    $("#dates").text(`${start} - ${end}`);

    await App.loadCandidates(electionId);
  },

  loadCandidates: async function(electionId) {
    $("#boxCandidate").empty();
    console.log("Fetching candidates for election", electionId, "...");
    
    try {
      const cRes = await fetch(`${getBackendUrl()}/blockchain/candidates-count/${electionId}`);
      const { count: countCandidates } = await cRes.json();
      
      let voted = false;
      if (App.voterId) {
        const vRes = await fetch(`${getBackendUrl()}/blockchain/check-vote/${electionId}/${App.voterId}`);
        const vData = await vRes.json();
        voted = vData.hasVoted;
      }
      
      const path = window.location.pathname;
      const isAdmin = path.includes("admin.html") || path.includes("addCandidate.html") || path.includes("viewResults.html");
      const isResultsPage = path.includes("viewResults.html") || path.includes("voterResults.html");
      
      const eRes = await fetch(`${getBackendUrl()}/blockchain/election/${electionId}`);
      const electionData = await eRes.json();
      const endDate = electionData.endDate * 1000;
      const electionEnded = Date.now() > endDate;
      
      for (let i = 1; i <= countCandidates; i++) {
        const candRes = await fetch(`${getBackendUrl()}/blockchain/candidate/${electionId}/${i}`);
        const data = await candRes.json();
        
        var id = data.id;
        var name = data.name;
        var party = data.party;
        var voteCount = data.voteCount;
        
        var backendUrl = getBackendUrl();
        var sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        var logoHtml = `<img src="${backendUrl}/logos/${sanitizedName}.png" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:contain;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'">`;
        logoHtml += `<img src="${backendUrl}/logos/${sanitizedName}.jpg" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:contain;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'">`;
        
        var actionContent = "";
        if (isAdmin || isResultsPage) {
          actionContent = `<td>${voteCount}</td>`;
        } else {
          var disabledAttr = (voted || electionEnded) ? 'disabled' : '';
          var titleAttr = electionEnded ? 'title="Election has ended"' : '';
          actionContent = `<td><button class="btn btn-success vote-btn" onclick="App.vote(${id})" ${disabledAttr} ${titleAttr} style="width:130px; font-weight:700;">✓ Vote</button></td>`;
        }
        
        var viewCandidates = `<tr><td>${logoHtml}</td><td>${name}</td><td>${party}</td>${actionContent}</tr>`;
        $("#boxCandidate").append(viewCandidates);
      }

      window.countCandidates = countCandidates;

      if (!isAdmin) {
        if (electionEnded) {
          $(".vote-btn").attr("disabled", true);
          let extraMsg = "";
          if (voted) {
            const vcRes = await fetch(`${getBackendUrl()}/blockchain/voter-choice/${electionId}/${App.voterId}`);
            const { candidateId } = await vcRes.json();
            const choiceRes = await fetch(`${getBackendUrl()}/blockchain/candidate/${electionId}/${candidateId}`);
            const choiceData = await choiceRes.json();
            extraMsg = `<br><span style="color:#10b981;">Your Confirmed Vote: ${choiceData.name} (${choiceData.party})</span>`;
          }
          $("#voteStatus").html(`<i class="fa-solid fa-clock"></i> Voting is closed. The election period has ended.${extraMsg}`).css("color", "#ef4444").show();
        } else if (voted) {
          $(".vote-btn").attr("disabled", true);
          const vcRes = await fetch(`${getBackendUrl()}/blockchain/voter-choice/${electionId}/${App.voterId}`);
          const { candidateId } = await vcRes.json();
          const choiceRes = await fetch(`${getBackendUrl()}/blockchain/candidate/${electionId}/${candidateId}`);
          const choiceData = await choiceRes.json();
          $("#voteStatus").html("Vote Confirmed! You voted for: " + choiceData.name + " (" + choiceData.party + ")").css("color", "#10b981").show();
        } else {
          $("#voteStatus").hide();
        }
      }
    } catch (e) {
      console.warn("Could not fetch candidates or voting status:", e.message);
    }
  },

  vote: async function(candidateID) {    
    if (!App.currentElectionId) {
      alert("No election selected.");
      return;
    }
    if (!candidateID) {
      $("#msg").html("<p class='text-danger'>Invalid candidate selection.</p>")
      return
    }
    if (!App.voterId) {
      alert("Voter Identity not found. Please log in again.");
      return;
    }
    
    $(".vote-btn").attr("disabled", true);
    $("#msg").html("<p class='text-primary'>Processing vote... Please wait.</p>");

    try {
      const res = await fetch(`${getBackendUrl()}/blockchain/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          electionId: parseInt(App.currentElectionId),
          candidateId: parseInt(candidateID),
          voterId: App.voterId
        })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Voting failed");
      }
      
      $("#msg").html("<p class='text-success'>Vote cast successfully!</p>");
      App.loadCandidates(App.currentElectionId);
    } catch (err) {
      console.error("ERROR! " + err.message);
      $("#msg").html("<p class='text-danger'>Error: " + err.message + "</p>");
      alert("Voting Failed:\n" + err.message);
      if (!err.message.toLowerCase().includes("voted")) {
        $(".vote-btn").attr("disabled", false);
      }
    }
  }
}

window.addEventListener("load", function() {
  window.App.eventStart()
})
