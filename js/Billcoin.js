var Billcoin = function(){

	var self = this;
	self.mainDomain = "api/";

	self.model = {
		wallets:[],
		transactionsPending:[],
		mining:{
			running:false
		},
		totalBalance:0,
		balanceUpdateTime:10
	};

	self.block = new Block();
	self.blockchain = [];
	self.timestampBlockchain = "";
	self.timestampTransaction = "";

	self.setupDOM = function(){

		$( "#dialog-form" ).dialog({
	      autoOpen: false,
	      height: 270,
	      width: 450,
	      modal: true,
	      buttons: {
	      	/*"Calculate Balance":function(){
	      		var billcoinTx = new BillcoinTransaction();
				var selectedWallet = "";
				var selectedWalletVal = $("#newTx .wallets").find(":selected").val();				
				for(var key in self.model.wallets()){
					if(self.model.wallets()[key].address() == selectedWalletVal){
						selectedWallet = { 
							address : self.model.wallets()[key].address, 
							wifCompressed : self.model.wallets()[key].wifCompressed,
							publicKey : self.model.wallets()[key].publicKey
						};
					}
				};
				billcoinTx.generate( selectedWallet, $("#newTxToAddress").val(), $("#newTxAmount").val() );
				$("#newTxBalance").html(billcoinTx.balance);				
	      	},*/
			"Add Transaction to Queue": function() {
				var billcoinTx = new BillcoinTransaction();
				var selectedWallet = "";
				var selectedWalletVal = $("#newTx .wallets").find(":selected").val();
				for(var key in self.model.wallets()){
					if(self.model.wallets()[key].address() == selectedWalletVal){
						selectedWallet = { 
							address : self.model.wallets()[key].address, 
							wifCompressed : self.model.wallets()[key].wifCompressed,
							publicKey : self.model.wallets()[key].publicKey
						};
					}
				};
				if($("#newTxToAddress").val() == "" || $("#newTxToAddress").val() == null
					|| $("#newTxAmount").val() == "" || $("#newTxAmount").val() == null){
					alertify.error("You have to add a sender's address and an amount");
				}else{
					billcoinTx.generate( selectedWallet, $("#newTxToAddress").val(),$("#newTxAmount").val() );
					if(billcoinTx.balance < parseFloat($("#newTxAmount").val())){
						alertify.error("The wallet you are sending from has insufficient funds. Its balance is " + billcoinTx.balance + " and you are trying to send " + $("#newTxAmount").val());
					}else{
						billcoin.showStoppage("Sending transaction to network. Please wait...");
						//$("#newTxBalance").html(billcoinTx.balance);
						$.post("api/sendNewTx.php",{transaction : billcoinTx.txJson, raw : billcoinTx.txRaw}, function(){
							billcoin.hideStoppage();
						});
						$( "#dialog-form" ).dialog( "close" );
					}
				}
	        }
	      }
		});

		$( "#dialog-block" ).dialog({
		  autoOpen: false,
		  height: 270,
		  width: 450,
		  modal: true
		});

		$(".new_transaction_btn").button().click(function() {
			$( "#dialog-form" ).dialog( "open" );
			if(tour.running){
				var tourWallet = $("#newTx .wallets").find(":selected").val();
				$( "#dialog-form #newTxToAddress" ).val(tourWallet);
				$( "#dialog-form #newTxAmount" ).val(0);
			}
		});

		$("#generate_btn").click(function(){
			self.generateWallet();
		});
		$("#clear_btn").click(function(){
			self.clearWallet();
		});
		$("#import_btn").click(function(){
			$("#import_wallet").trigger("click");
		});
		$("#export_btn").click(function(e){
			e.stopImmediatePropagation();
			self.exportWallet();
		});

		$("#import_wallet").click(function(e){
			e.stopImmediatePropagation();
		})

		$("section").on("click", ".miner_btn", function(){
			if($(this).hasClass("start_mining")){				
				self.startMining();
			}else{
				self.stopMining();
			}
		});

		$("#blockchain").on("click",".block_element",function(){
			$( "#dialog-block" ).html($(this).attr("data-block"));
			$( "#dialog-block" ).dialog( "open" );
		});

		$("#tour_stop").on("click",".button",function(){
			tour.Tour.stopTour();
		});

		$("div").on("click","#start_tour",function(){
			tour.Tour.startFrom = 0;
			tour.Tour.showStep();
		});

		self.importWalletSetup();
	};

	self.showStoppage = function(msg){
		$(".stoppage .inner").html("");
		$(".stoppage").css("display","block");
		$(".stoppage .inner").html(msg);
	};

	self.hideStoppage = function(){
		$(".stoppage").css("display","none");
		$(".stoppage .inner").html("");
	};

	self.setupModel = function(){
		self.model = ko.mapping.fromJS(self.model);
		ko.applyBindings(self.model);
	};

	//MINING EVENTS
	self.startMining = function(){

		var wallet = $('#miner_wallet').find(":selected");
		var previousBlockHash = "0000000000000000000000000000000000000000000000000000000000000000";
		if(self.blockchain.length != 0){
			previousBlockHash = self.blockchain[self.blockchain.length - 1].hash;
		};

		if(wallet == null){
			alert("Create a wallet first before mining.");
		}else{
			self.block.startMining(ko.mapping.toJS(self.model.transactionsPending), 
				{
					address:ko.observable(wallet.val()), 
					wifCompressed:ko.observable(wallet.attr("data-private")), 
					publicKey:ko.observable(wallet.attr("data-publickey"))
				}, previousBlockHash)
		}
	};

	self.stopMining = function(){
		self.block.stopMining();
	};

	//WALLET EVENTS
	self.setupWallets = function(){
		if("wallets" in localStorage && localStorage.getItem("wallets") != "undefined"){
			self.model.wallets = JSON.parse(localStorage.getItem("wallets"));
		}else{
			localStorage.setItem("wallets", JSON.stringify(self.model.wallets));
		}
		self.setupModel();
		self.setupDOM();
	}

	self.generateWallet = function(){
		var wallet = new Wallet();
		wallet.generate();
		self.model.wallets.push({
			address:ko.observable(wallet.address),
			wifCompressed:ko.observable(wallet.wifCompressed),
			publicKey:ko.observable(wallet.publicKeyHex),
			balance:ko.observable(0)
		});
		localStorage.setItem("wallets", JSON.stringify(ko.mapping.toJS(self.model.wallets)));
	};

	self.clearWallet = function(){
		self.model.wallets([]);
		localStorage.setItem("wallets", "[]");
	};

	self.exportWallet = function(){
		var exportData = 'data:text/plain;charset=UTF-8,' + JSON.stringify(ko.mapping.toJSON(self.model.wallets));
		$("#export_btn a").attr({
            'download': 'wallets.txt',
            'href': exportData,
            'target': '_blank'
        });
        $("#export_btn a")[0].click();
	};

	self.importWalletSetup = function(){
		$("#import_wallet").change(function (event) {
            var fileReader = new FileReader();
            fileReader.readAsText($('#import_wallet')[0].files[0]);
            fileReader.onload = function (e) {
            	var loadData = JSON.parse(e.target.result);
            	loadData = jQuery.parseJSON(loadData);
            	localStorage.setItem("wallets", JSON.stringify(loadData));
            	self.model.wallets([]);
            	for(var key in loadData){
            		var importWallet = loadData[key];
            		self.model.wallets.push({
						address:ko.observable(importWallet.address),
						wifCompressed:ko.observable(importWallet.wifCompressed),
						publicKey:ko.observable(importWallet.publicKey),
						balance:ko.observable(0)
					});
            	}
            };
        });
	};

	self.updateTransactionData = function(){
		$.ajax({
            type: "GET",
            url: "api/getNewData.php?dataType=transactions&timestamp="  + self.timestampTransaction ,
            async: true,
            cache: false,
            timeout:10000,

            success: function(response){ 
                
            	if(response == null || response == ""){
            		self.model.transactionsPending([]);
            		$("#pendingTransactions").html("");
            		return;
            	}

                var json = JSON.parse(response);
                self.timestampTransaction = json.timestamp;
                var data = json.data;
                var dataJson = "[" + data.replace(/}{/g,"}\,{") + "]";
				var transactions = jQuery.parseJSON(dataJson);
				var liTrans = "";
				self.model.transactionsPending([]);
				for(var key in transactions){
					liTrans += "<li>" + JSON.stringify(transactions[key]) + "</li>";
					self.model.transactionsPending.push(transactions[key]);
				};
				$("#pendingTransactions").html(liTrans);
            },
            complete:function(){
            }
        });
	};

	self.updateBlockchainData = function(){
		$.ajax({
            type: "GET",
            url: "api/getNewData.php?dataType=blockchain&timestamp=" + self.timestampBlockchain,
            async: true,
            cache: false,
            timeout:10000,

            success: function(response){ 
                
            	if(response == null || response == ""){
            		self.blockchain = [];
            		$("#blockchain").html("");
            		return;
            	}

                var json = JSON.parse(response);
                self.timestampBlockchain = json.timestamp;
                var data = json.data;
				var dataJson = "[" + data + "]";
				var jQueryData = jQuery.parseJSON((dataJson));
				var liTrans = "";
				for(var key in jQueryData){
					liTrans += "<li class='block_element' data-block='" + JSON.stringify(jQueryData[key]) + "'><a href='#'>" + jQueryData[key].hash + "</a></li>";
				};
				self.blockchain = jQueryData;
				$("#blockchain").html(liTrans);
            },
            complete:function(){
            }
        });
	};

	self.updateBalance = function(){
		var total = 0;
		var billcoinTx = new BillcoinTransaction();
		for(var key=0; key <= self.model.wallets().length-1;key++){
			billcoinTx.generate(self.model.wallets()[key],"1HZwkjkeaoZfTSaJxDw6aKkxp45agDiEzN",0);
			total += parseFloat(billcoinTx.balance);
		}
		self.model.totalBalance(total);
	};	

	self.setupWallets();
	self.updateTransactionData();
	self.updateBlockchainData();
	self.updateBalance();

	setInterval(function(){
		self.updateTransactionData();
	},10000);
	setInterval(function(){
		self.updateBlockchainData();
	},10000);
	setInterval(function(){
		self.updateBalance();
    		self.model.balanceUpdateTime(10);
	},10000);
	setInterval(function(){
		self.model.balanceUpdateTime(self.model.balanceUpdateTime() - 1);
	},1000);

};