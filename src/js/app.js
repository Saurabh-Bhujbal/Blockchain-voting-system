// import "../css/style.css"

const Web3 = require('web3');
const contract = require('@truffle/contract');

const votingArtifacts = require('../../build/contracts/Voting.json');
var VotingContract = contract(votingArtifacts)

window.App = {
  account: null,
  instance: null,
  currentElectionId: null,

  eventStart: async function() { 
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const account = accounts[0];
      
      VotingContract.setProvider(window.ethereum);
      VotingContract.defaults({
        from: account,
        gas: 6654755
      });

      // Load account data
      App.account = account;
      $("#accountAddress").html("Your Account: " + account);
      
      App.instance = await VotingContract.deployed();
      console.log("Contract deployed instance found");
      
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
          const electionData = await App.instance.getElection(electionId);
          $("#electionNameDisplay").text(electionData[1]);
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
        var nameCandidate = $('#name').val();
        var partyCandidate = $('#party').val();
        console.log("Adding candidate:", nameCandidate, "to election:", App.currentElectionId);
        
        $('.btn-submit-content').hide();
        $('.btn-submit-loader').show();

        await App.instance.addCandidate(App.currentElectionId, nameCandidate, partyCandidate);
        // Page reload will be handled by UI JS after logo upload
      } catch (err) {
        console.error("Add Candidate error:", err);
        alert("Error adding candidate. Check console.");
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
        await App.instance.addElection(electionName, startDate, endDate);
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
        // Fetch the election details to check if it has ended
        const data = await App.instance.getElection(App.currentElectionId);
        const endDate = data[3].toNumber() * 1000; // convert BigNumber to ms
        const now = Date.now();
        const electionEnded = now > endDate;

        // Hide the "select election" prompt, show the candidate area
        $('#noElectionPrompt').hide();
        $('#candidateArea').show();

        if (electionEnded) {
          // Election over — disable Register Candidate button and show notice
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
    const count = await App.instance.getElectionsCount();
    const $select = $(`#${dropdownId}`);
    $select.empty();
    
    if (count == 0) {
      $select.append('<option value="">No elections available</option>');
      return;
    }

    $select.append('<option value="" disabled selected>-- Select an Election --</option>');
    for (let i = 1; i <= count; i++) {
      const data = await App.instance.getElection(i);
      $select.append(`<option value="${data[0]}">${data[1]}</option>`);
    }
  },

  loadElectionsGrid: async function() {
    const count = await App.instance.getElectionsCount();
    const $grid = $("#electionsGrid");
    const $pastGrid = $("#pastElectionsGrid");
    $grid.empty();
    $pastGrid.empty();

    let activeCount = 0;
    let pastCount = 0;

    for (let i = 1; i <= count; i++) {
      const data = await App.instance.getElection(i);
      const id = data[0].toNumber();
      const name = data[1];
      const endDateMs = data[3].toNumber() * 1000;
      const start = new Date(data[2].toNumber() * 1000).toDateString();
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
    const data = await App.instance.getElection(electionId);
    const start = new Date(data[2].toNumber() * 1000).toDateString();
    const end = new Date(data[3].toNumber() * 1000).toDateString();
    $("#dates").text(`${start} - ${end}`);

    await App.loadCandidates(electionId);
  },

  loadCandidates: async function(electionId) {
    $("#boxCandidate").empty();
    console.log("Fetching candidates for election", electionId, "...");
    
    try {
      const countCandidates = await App.instance.getCandidatesCount(electionId);
      const voted = await App.instance.checkVote(electionId);
      
      const path = window.location.pathname;
      const isAdmin = path.includes("admin.html") || path.includes("addCandidate.html") || path.includes("viewResults.html");
      const isResultsPage = path.includes("viewResults.html") || path.includes("voterResults.html");
      
      const electionData = await App.instance.getElection(electionId);
      const endDate = electionData[3].toNumber() * 1000;
      const electionEnded = Date.now() > endDate;
      
      for (let i = 1; i <= countCandidates; i++) {
        const data = await App.instance.getCandidate(electionId, i);
        var id = data[0];
        var name = data[1];
        var party = data[2];
        var voteCount = data[3];
        
        var logoName = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        var logoHtml = `<img src="/logos/${logoName}.png" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:contain;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'">`;
        logoHtml += `<img src="/logos/${logoName}.jpg" alt="" style="width:44px;height:44px;border-radius:8px;object-fit:contain;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);" onerror="this.style.display='none'">`;
        
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
            const choiceId = await App.instance.getVoterChoice(electionId, App.account);
            const choiceData = await App.instance.getCandidate(electionId, choiceId);
            extraMsg = `<br><span style="color:#10b981;">Your Confirmed Vote: ${choiceData[1]} (${choiceData[2]})</span>`;
          }
          $("#voteStatus").html(`<i class="fa-solid fa-clock"></i> Voting is closed. The election period has ended.${extraMsg}`).css("color", "#ef4444").show();
        } else if (voted) {
          $(".vote-btn").attr("disabled", true);
          const choiceId = await App.instance.getVoterChoice(electionId, App.account);
          const choiceData = await App.instance.getCandidate(electionId, choiceId);
          $("#voteStatus").html("Vote Confirmed! You voted for: " + choiceData[1] + " (" + choiceData[2] + ")").css("color", "#10b981").show();
        } else {
          $("#voteStatus").hide();
        }
      }
    } catch (e) {
      console.warn("Could not fetch candidates or voting status:", e.message);
    }
  },

  vote: function(candidateID) {    
    if (!App.currentElectionId) {
      alert("No election selected.");
      return;
    }
    if (!candidateID) {
      $("#msg").html("<p class='text-danger'>Invalid candidate selection.</p>")
      return
    }
    
    $(".vote-btn").attr("disabled", true);
    $("#msg").html("<p class='text-primary'>Processing vote... Please wait.</p>");

    App.instance.vote(App.currentElectionId, parseInt(candidateID)).then(function(result){
      $("#msg").html("<p class='text-success'>Vote cast successfully!</p>");
      App.loadCandidates(App.currentElectionId); // Reload candidates for this election
    }).catch(function(err){ 
      console.error("ERROR! " + err.message);
      var cleanErr = err.message.replace("RPC submit: VM Exception while processing transaction: revert ", "");
      $("#msg").html("<p class='text-danger'>Error: " + cleanErr + "</p>");
      alert("Voting Failed:\n" + cleanErr);
      if (!err.message.includes("voted")) {
        $(".vote-btn").attr("disabled", false);
      }
    });
  }
}

window.addEventListener("load", function() {
  if (typeof web3 !== "undefined") {
    console.warn("Using web3 detected from external source like Metamask")
    window.eth = new Web3(window.ethereum)
  } else {
    console.warn("No web3 detected. Falling back to http://192.168.137.1:9545.")
    window.eth = new Web3(new Web3.providers.HttpProvider("http://192.168.137.1:9545"))
  }
  window.App.eventStart()
})
