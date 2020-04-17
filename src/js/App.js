App = {
  Web3Provider: null,
  Contracts: {},
  Account: "",
  VoteEligible: false,
  VoteSubmitted: false,
  SelectedId: 0,
  LastRefresh: 0,
  LatestElectionID: 0,
  SelectedElectionID: 0,
  SelectedElectionData: null,
  RefreshMS: 1000,

  setVoteId: (id) => {
    App.SelectedId = id;
    $.notify("Candidate selected: " + App.SelectedId, "success");
    App.RenderVoteBtn();
  },

  canRefresh: () => {
    var _now = new Date().getTime() //Epoch in ms
    if (_now > (App.LastRefresh + App.RefreshMS)) {
      App.LastRefresh = _now;
      return true;
    }
    return false;
  },

  init: () => {
    if (!App.canRefresh()) return;
    App.initWeb3();
    App.initContract();
  },

  reload: () => {
    App.Account = "";
    App.VoteSubmitted = false;
    App.SelectedId = 0;
    App.Web3Provider = null;
    App.LastRefresh = 0;
    App.init();
  },

  refresh: (force) => {
    if (!force)
      if (!App.canRefresh()) return;
    App.Contracts.Evoting.deployed().then(instance => {
      App.RenderResults(instance);
    });
  },

  initWeb3: () => {
    if (window.ethereum) {
      App.Web3Provider = window.ethereum;
      try {
        window.ethereum.enable();
        $.notify("Wallet Connected", "success");
      } catch (error) {

      }
    } else if (window.web3) {
      App.Web3Provider = window.web3.currentProvider;
    } else {
      $("#vote-btn").text("No wallet connection");
      $("#vote-btn").removeAttr("onclick");
      $("#vote-icon").removeClass();
      $("#vote-icon").addClass("gg-close", "");
      $.notify("Warning: Wallet not connected", "warn");
      $.notify("Install & connect wallet to vote", "warn");

      App.Account = null;

      App.Web3Provider = new Web3.providers.HttpProvider(
        "https://ropsten.infura.io/v3/73144deaea414730a374fa43e57abe7a"
      );
    }

    console.log("provider: ", App.Web3Provider);
  },

  initContract: () => {
    $.getJSON("./contracts/Evoting.json", function (data) {

      App.Contracts.Evoting = TruffleContract(data);
      App.Contracts.Evoting.setProvider(App.Web3Provider);

      if (App.Account !== null) {
        web3.eth.getCoinbase(function (err, Account) {
          if (err === null) {
            App.Account = Account;
            $("#AccountAddress").html("Active Account: " + Account);
          } else {
            console.warn("get Account fail");
          }
        });
      }

      App.Contracts.Evoting.deployed().then(instance => {
        instance.ElectionsCount().then(_id => {
          console.log("Election count:" + _id);
          console.log("App.LatestElectionID:" + _id);

          App.LatestElectionID = _id;
          if (Cookies.get("SelectedElectionID") != null) {
            App.SelectedElectionID = Cookies.get("SelectedElectionID");
          } else {
            if (App.SelectedElectionID > 0) {
              App.SelectedElectionID = _id;
              Cookies.set("SelectedElectionID", _id);
            }
          }
          console.log("SelectedElectionID:" + App.SelectedElectionID);

          if (App.LatestElectionID > App.SelectedElectionID) {
            $("#election-info-2").show();
            $("#election-info-2").text("New Elections Available(" + App.LatestElectionID + ")");
            $("#election-info-2").css("cursor", "pointer");
            $("#election-info-2").click(function () {
              Cookies.set("SelectedElectionID", App.LatestElectionID);
              $("#election-info-2").hide();
              App.reload();
              return;
            });
          } else {

          }

          instance.Elections(App.SelectedElectionID).then(_electionData => {
            App.SelectedElectionData = _electionData;
            console.log("Election data: " + _electionData);
            $("#election-info").text("Selected Elections: ID: " + _electionData[0] + " Name: " + _electionData[1]);

            App.ResolveVoted(instance);
          });
        });
      });
    });
  },

  RenderResults: (instance) => {
    var table_results = $("#table-results");
    var _add = false;
    if (App.SelectedElectionData[5] != $("#table-results").find("li.table-row").length) {
      _add = true;
      $("#table-results").find("li.table-row").remove();
    }

    for (var i = 1; i <= App.SelectedElectionData[5]; i++) {
      instance.GetCandidate(App.SelectedElectionID, i).then(candidate => {
        var id = candidate[0];
        var name = candidate[1];
        var voteCount = candidate[2];

        if (_add) {
          var candidateTemplate =
            "<li class='table-row'><div class='col col-1' data-label='ID#'>" +
            id +
            "</div><div class='col col-2' data-label='Candidate'>" +
            name +
            "</div><div id='vote-count-" + id + "' class='col col-3' data-label='Votes'>" +
            voteCount +
            "</div></li>";
          table_results.append(candidateTemplate);
        } else {
          $('#vote-count-' + id).text(voteCount);
        }
      });
    }
  },

  ResolveVoted: (instance) => {
    instance.CanVote(App.Account).then(_canVote => {
      App.VoteEligible = _canVote;
      console.log("VoteEligible: " + App.VoteEligible);
      instance.HasVoted(App.Account).then(_hasVoted => {
        App.VoteSubmitted = _hasVoted;
        console.log("VoteSubmitted: " + App.VoteSubmitted);
        App.refresh(true);
        App.RenderCandidatesOptions(instance);
        App.RenderVoteBtn();
      });
    });
  },

  RenderVoteBtn: () => {
    //active election?   
    //voting complete?
    epochSeconds = Math.round(Date.now() / 1000);
    console.log("timeprint " + App.SelectedElectionData[4]);
    if (App.SelectedElectionData[4] < epochSeconds || App.LatestElectionID != App.SelectedElectionID) {
      $("#vote-btn").text("Voting Finished");
      $("#vote-btn").addClass("disabled", "");
      $("#vote-icon").removeClass();
      $("#vote-icon").addClass("gg-check-o");
      $("#candidate-select").hide();
      return;
    }

    //can vote?
    if (!App.VoteEligible) {
      $("#vote-btn").text("Not Eligible to vote");
      $("#vote-btn").addClass("disabled", "");
      $("#vote-icon").removeClass();
      $("#vote-icon").addClass("gg-block");
      $("#candidate-select").hide();
      return;
    }

    if (App.VoteSubmitted) {
      $("#vote-btn").text("Vote received!");
      $("#vote-icon").removeClass();
      $("#vote-icon").addClass("gg-check-o");
      $('#vote-btn').css('cursor', 'default');
      $("#candidate-select").hide();
    } else {
      $("#candidate-select").show();
      if (App.SelectedId > 0) {
        $("#vote-btn").removeClass("disabled", "");
        $("#vote-btn").text("Submit vote");
        $("#vote-icon").removeClass();
        $("#vote-icon").addClass("gg-chevron-double-right");
        $("#vote-btn").attr("onclick", "App.Vote();");
        $('#vote-btn').css('cursor', 'pointer');
      } else if (App.SelectedId === 0 || !App.VoteSubmitted) {
        $("#vote-btn").text("Choose your candidate");
        $("#vote-btn").addClass("disabled", "");
        $("#vote-icon").removeClass();
        $("#vote-icon").addClass("gg-chevron-double-down");
      }
    }
  },

  RenderCandidatesOptions: (instance) => {
    console.log("Rendiring candidate options");

    if (App.VoteSubmitted) {
      $.notify("Vote already submited", "warn");
      $("#candidate-select").hide();
      return;
    }
    $("#candidate-select").show();

    var candidatesSelect = $("#candidatesSelect").children()[1].children[0];
    candidatesSelect.innerHTML = "";
    jQuery(".sel-option").remove();
    for (var i = 1; i <= App.SelectedElectionData[5]; i++) {
      instance.GetCandidate(App.SelectedElectionID, i).then(candidate => {
        var id = candidate[0];
        var name = candidate[1];
        var candidateOption =
          '<div class="sel-option" onclick="App.setVoteId(' +
          id +
          ');" data-cuteselect-value="' +
          id +
          '" >' +
          name +
          "</div>";
        candidatesSelect.innerHTML += candidateOption;
      });
    }
  },

  Vote: () => {
    if (App.Account === null) {
      $.notify("Cant vote, wallet not connected!", "error");
      return;
    }
    if (App.SelectedId === 0) {
      $.notify("You need to select candidate to vote!", "error");
      return;
    }

    $("#candidate-select").hide();

    $("#vote-btn").text("confirm transaction...");
    $("#vote-btn").removeAttr("onclick");
    $("#vote-icon").removeClass();
    $("#vote-icon").addClass("gg-keyhole", "");
    $('#vote-btn').css('cursor', 'default');

    App.Contracts.Evoting.deployed()
      .then(instance => {
        return instance.Vote(App.SelectedId, {
          from: App.Account
        });
      })
      .then(result => {
        App.reload();
      })
      .catch(err => {
        App.reload();
      });
  },

  CreateElections: () => {
    App.Contracts.Evoting.deployed()
      .then(instance => {
        var _candidates = Array();
        var lines = $('#candidates_list').val().split('\n');
        var len = 0;
        for (var i = 0; i < lines.length; i++) {
          if (lines[i].length > 3) {
            _candidates[i] = web3.fromAscii(lines[i]);
            len++;
          }
        }
        return instance.addElections($('#election_name').val(), _candidates, len, $('#duration_seconds').val(), {
          from: App.Account
        });
      })
      .then(result => {
        console.log("result: " + result);
      })
      .catch(err => {
        console.log("error: " + err);
      });
  },

  RegisterVoter: () => {
    App.Contracts.Evoting.deployed()
      .then(instance => {
        return instance.RegisterVoter($('#voter_address').val(), $('#voter_pool_id').val(), {
          from: App.Account
        });
      })
      .then(result => {
        console.log("result: " + result);
      })
      .catch(err => {
        console.log("error: " + err);
      });
  },

  BanVoter: () => {
    App.Contracts.Evoting.deployed()
      .then(instance => {
        return instance.BanVoter($('#voter_ban_address').val(), {
          from: App.Account
        });
      })
      .then(result => {
        console.log("result: " + result);
      })
      .catch(err => {
        console.log("error: " + err);
      });
  }
};



$(function () {
  $(window).load(function () {
    App.init();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', function (accounts) {
        console.log("Account changed to: " + accounts[0]);
        if (App.Account == accounts[0])
          return;
        App.reload();
      })
    }

    setInterval(function () {
      App.refresh();
    }, 500);
  });
});