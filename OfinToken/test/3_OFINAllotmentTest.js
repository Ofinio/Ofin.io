const OFINToken = artifacts.require("OFINToken");
// const TokenTimelock = artifacts.require("TokenTimelock");
const OFINAllotment = artifacts.require("OFINAllotment");
const BigNumber = require("bignumber.js");
const {time} = require("@openzeppelin/test-helpers");
const truffleAssert = require("truffle-assertions");

contract("Token Allotment Contract", async function(accounts){

    var admin = accounts[0];
    var alloter = accounts[1];
    var stakingWallet = accounts[2];
    var promoWallet = accounts[3];
    var teamWallet = accounts[4];
    var privateRoundWallet = accounts[5];

    const stakingWalletTime = 1600128000;
    const promoWalletTime = 1604534400;
    const teamWalletTime = 1661731200;
    const privateRoundTime = 1601856000;

    const extendedPromoWalletTime = 1604536400;

    const stakingFund = "3888888";
    const promoFund = "777777";
    const teamFund = "777777";
    const privateRoundFund = "388888";
    const releasedFund = "1944447";

    const balanceWithVestingContract = "5833330";

    const stakingString = "stake";
    const promoString = "promo";
    const teamString = "team";
    const privateString = "priv";
    
    var ofin;
    var ofinAllotment;

    before(async function (){
        ofin = await OFINToken.new({from: admin});
        ofinAllotment = await OFINAllotment.new(ofin.address,{from: admin});
    });

    it("Positive Test - Add alloter grantAlloterRole", async()=> {
        const result = await ofinAllotment.grantAlloterRole(alloter);
        var event = result.logs[0].event;
    
        assert.equal( event, "RoleGranted", "RoleGranted event should be fired" );
    });


    it('Negative Test - create staking allotment without MinterRole', async function () {

        try{
            await ofinAllotment.allotTokens( stakingWallet, stakingWalletTime, web3.utils.toWei(stakingFund, "ether"),stakingString );
            assert.fail("Minting of the token should not be done");
        } catch( error ){
            assert.include(error.toString(), "OFINToken: must have minter role to mint", error.message);
        }
    });

    it("Positive Test - grant token mint role to allotment", async()=> {
        const result = await ofin.grantMinterRole(ofinAllotment.address);
        var event = result.logs[0].event;
    
        assert.equal( event,"RoleGranted", "RoleGranted event should be fired"
          );
    });

    it('Positive Test - create staking allotment', async function () {

        let tx = await ofinAllotment.allotTokens.sendTransaction( stakingWallet, stakingWalletTime, web3.utils.toWei(stakingFund, "ether"),stakingString );

        let vestingContractAddress;

        truffleAssert.eventEmitted(tx, 'TokenVested', (ev) => {
            vestingContractAddress = ev.vestingContract;
            return ev.vestingContract === ofinAllotment.address && ev.beneficiary===stakingWallet;
        });

        let stakingAllotment = await ofinAllotment.getAllotments({from:stakingWallet});

        assert.equal(await stakingAllotment[0]._name, stakingString,"Incorrect TokenTimeLock contract creation");
        assert.equal(await stakingAllotment[0]._beneficiary, stakingWallet,"Incorrect TokenTimeLock contract creation");
        assert.equal(BigNumber(await stakingAllotment[0]._releaseTime), stakingWalletTime, "Incorrect TokenTimeLock contract creation");
        assert.equal(await stakingAllotment[0]._tokenCount, web3.utils.toWei(stakingFund, "ether"), "Incorrect TokenTimeLock contract creation");

        let stakingWalletBalance = await ofinAllotment.getTotalBalance.call({from:stakingWallet});
        assert.equal(BigNumber(stakingWalletBalance), 0, "Incorrect Balance for user");

        let stakingAllotmentBalance = await ofinAllotment.getTotalBalance.call({from:ofinAllotment.address});
        console.log(BigNumber(stakingAllotmentBalance));
        assert.equal(stakingAllotmentBalance, web3.utils.toWei(stakingFund, "ether"), "Incorrect Balance for vestingContract");

    });

    it('Positive Test - create promo allotment from alloter', async function () {
        
        let tx = await ofinAllotment.allotTokens.sendTransaction( promoWallet, promoWalletTime, web3.utils.toWei(promoFund, "ether"),promoString, {from: alloter} );

        let vestingContractAddress;

        truffleAssert.eventEmitted(tx, 'TokenVested', (ev) => {
            vestingContractAddress = ev.vestingContract;
            return ev.vestingContract === ofinAllotment.address && ev.beneficiary===promoWallet;
        });

        let promoAllotment = await ofinAllotment.getAllotments({from:promoWallet});

        assert.equal(await promoAllotment[0]._name, promoString,"Incorrect TokenTimeLock contract creation");
        assert.equal(await promoAllotment[0]._beneficiary, promoWallet,"Incorrect TokenTimeLock contract creation");
        assert.equal(BigNumber(await promoAllotment[0]._releaseTime), promoWalletTime, "Incorrect TokenTimeLock contract creation");
        assert.equal(await promoAllotment[0]._tokenCount, web3.utils.toWei(promoFund, "ether"), "Incorrect TokenTimeLock contract creation");

        let promoWalletBalance = await ofinAllotment.getTotalBalance.call({from:promoWallet});
        assert.equal(BigNumber(promoWalletBalance), 0, "Incorrect Balance for user");

    });

    it('Positive Test - create team allotment', async function () {
        
        let tx = await ofinAllotment.allotTokens.sendTransaction( teamWallet, teamWalletTime, web3.utils.toWei(teamFund, "ether"),teamString );

        let vestingContractAddress;

        truffleAssert.eventEmitted(tx, 'TokenVested', (ev) => {
            vestingContractAddress = ev.vestingContract;
            return ev.vestingContract ===ofinAllotment.address && ev.beneficiary===teamWallet;
        });

        let teamAllotment = await ofinAllotment.getAllotments({from:teamWallet});

        assert.equal(await teamAllotment[0]._name, teamString,"Incorrect TokenTimeLock contract creation");
        assert.equal(await teamAllotment[0]._beneficiary, teamWallet,"Incorrect TokenTimeLock contract creation");
        assert.equal(BigNumber(await teamAllotment[0]._releaseTime), teamWalletTime, "Incorrect TokenTimeLock contract creation");
        assert.equal(await teamAllotment[0]._tokenCount, web3.utils.toWei(teamFund, "ether"), "Incorrect TokenTimeLock contract creation");

        let teamWalletBalance = await ofinAllotment.getTotalBalance.call({from:teamWallet});
        assert.equal(BigNumber(teamWalletBalance), 0, "Incorrect Balance for user");

    });

    it('Positive Test - create privateRound allotment', async function () {
        
        let tx = await ofinAllotment.allotTokens.sendTransaction( privateRoundWallet, privateRoundTime, web3.utils.toWei(privateRoundFund, "ether"),privateString );

        let vestingContractAddress;

        truffleAssert.eventEmitted(tx, 'TokenVested', (ev) => {
            vestingContractAddress = ev.vestingContract;
            return ev.vestingContract === ofinAllotment.address && ev.beneficiary===privateRoundWallet;
        });

        let privateRoundAllotment = await ofinAllotment.getAllotments({from:privateRoundWallet});

        assert.equal( privateRoundAllotment[0]._name, privateString,"Incorrect TokenTimeLock contract creation");
        assert.equal( privateRoundAllotment[0]._beneficiary, privateRoundWallet,"Incorrect TokenTimeLock contract creation");
        assert.equal(BigNumber( privateRoundAllotment[0]._releaseTime), privateRoundTime, "Incorrect TokenTimeLock contract creation");
        assert.equal( privateRoundAllotment[0]._tokenCount, web3.utils.toWei(privateRoundFund, "ether"), "Incorrect TokenTimeLock contract creation");
        
        let privateRoundWalletBalance = await ofinAllotment.getTotalBalance.call({from:privateRoundWallet});
        assert.equal(BigNumber(privateRoundWalletBalance), 0, "Incorrect Balance for user");

    });

    it('Positive Test - mint releasedFund to owner', async function () {
        
        let result = await ofin.mint(admin, web3.utils.toWei(releasedFund, "ether"));
        var event = result.logs[0].event;
    
        assert.equal( event, "Transfer", "Transfer event should be fired" );

        let ownerBalance = await ofinAllotment.getTotalBalance.call({from:admin});
        assert.equal(ownerBalance, web3.utils.toWei(releasedFund, "ether"), "Incorrect Balance for user");

    });

    it('Positive Test - Check total balance of the allotment', async function () {
        
        let total = await ofinAllotment.getTotalBalance.call({from:ofinAllotment.address});
        console.log(BigNumber(total));
        assert.equal(total, web3.utils.toWei(balanceWithVestingContract, "ether"), "Incorrect Balance for vestingContract");

    });

    it('Negative Test - mint more than cap', async function () {       
        try {
            await ofinAllotment.allotTokens.sendTransaction( privateRoundWallet, privateRoundTime, web3.utils.toWei("1", "ether"),"excess" )
            assert.fail("Minter can mint tokens more than token supply");
        } catch (error) {
            assert.include(error.toString(), "ERC20Capped: cap exceeded.", error.message);
        }
    });

    it('Negative Test - release before releaseTime', async function () {       
        try {
            await ofinAllotment.releaseAllotment.sendTransaction("team",{from: teamWallet} )
            assert.fail("Owner released funds before release time");
        } catch (error) {
            assert.include(error.toString(), "TokenTimelock: current time is before release time", error.message);
        }
    });

    it('Positive Test - Admin releases stacking fund', async function (){
        let allotments = await ofinAllotment.getBeneficiaryAllotments.call(stakingWallet);
        assert.equal(allotments.length,1,"More than expected allotments seen overall");

        await time.increaseTo(stakingWalletTime);
        let stakingAllotment = allotments[0];
        let tx = await ofinAllotment.releaseBeneficiaryAllotment.sendTransaction( stakingAllotment._beneficiary, stakingAllotment._name, {from: admin});
        truffleAssert.eventEmitted(tx, 'TokenReleased', (ev) => {
            return ev.vestingContract === ofinAllotment.address && ev.beneficiary===stakingWallet && ev.tokenCount== 3888888000000000000000000;
        });

        let stakingWalletBalance = await ofinAllotment.getTotalBalance.call({from:stakingWallet});
        assert.equal(stakingWalletBalance, web3.utils.toWei(stakingFund, "ether"), "Incorrect Balance for user");

        allotments = await ofinAllotment.getBeneficiaryAllotments.call(stakingWallet);
        assert.equal( allotments[0]._tokenCount, 0 , "Tokens have not been deducted");

    });

    it('Negative Test - StackingWallet tries to release a released fund', async function (){
        let allotments = await ofinAllotment.getBeneficiaryAllotments.call(stakingWallet);
        assert.equal(allotments.length,1,"More than expected allotments seen overall");

        let stakingAllotment = allotments[0];
        let tx = await ofinAllotment.releaseBeneficiaryAllotment.sendTransaction( stakingAllotment._beneficiary, stakingAllotment._name, {from: admin});
        truffleAssert.eventEmitted(tx, 'TokenReleased', (ev) => {
            return ev.vestingContract === ofinAllotment.address && ev.beneficiary === stakingWallet && ev.tokenCount==0;
        });

        let stakingWalletBalance = await ofinAllotment.getTotalBalance.call({from:stakingWallet});
        assert.equal(stakingWalletBalance, web3.utils.toWei(stakingFund, "ether"), "Incorrect Balance for user");

        allotments = await ofinAllotment.getBeneficiaryAllotments.call(stakingWallet);
        assert.equal( allotments[0]._tokenCount, 0 , "Tokens have not been deducted");
            
    });

    it('Negative Test - extend releasetime and release on older releaseTime', async function () {       
        try {

            let allotments = await ofinAllotment.getAllotments.call({from:promoWallet});
            assert.equal(allotments.length,1,"More than expected allotments seen for user");
            let promoAllotment = allotments[0];

            let tx = await ofinAllotment.setNewReleaseTime(promoAllotment._beneficiary, promoAllotment._name, extendedPromoWalletTime);
            truffleAssert.eventEmitted(tx, 'AllotmentVestTimeUpdated', (ev) => {
                return ev.vestingContract === ofinAllotment.address && ev.beneficiary === promoWallet && ev.newReleaseTime==extendedPromoWalletTime;
            });

            await time.increaseTo(promoWalletTime);
            await ofinAllotment.releaseAllotment.sendTransaction( promoAllotment._name, {from: promoWallet} );
            assert.fail("User released funds before release time");
        } catch (error) {
            assert.include(error.toString(), "TokenTimelock: current time is before release time", error.message);
        }
    });

    it('Positive Test - release after extended releaseTime', async function () {       
        await time.increaseTo(extendedPromoWalletTime);
        let allotments = await ofinAllotment.getAllotments.call({from:promoWallet});
        assert.equal(allotments.length,1,"More than expected allotments seen for user");
        let promoAllotment = allotments[0];

        let tx = await ofinAllotment.releaseAllotment.sendTransaction( promoAllotment._name, {from: promoWallet} );

        truffleAssert.eventEmitted(tx, 'TokenReleased', (ev) => {
            return ev.vestingContract === ofinAllotment.address && ev.beneficiary===promoWallet;
        });

        let promoWalletBalance = await ofinAllotment.getTotalBalance.call({from:promoWallet});
        assert.equal(promoWalletBalance, web3.utils.toWei(promoFund, "ether"), "Incorrect Balance for user");

        allotments = await ofinAllotment.getBeneficiaryAllotments.call(promoWallet);
        assert.equal( allotments[0]._tokenCount, 0 , "Tokens have not been deducted");
    
    });

    it('Positive Test - release after releaseTime', async function () {

        let allotments = await ofinAllotment.getAllotments.call({from:teamWallet});
        assert.equal(allotments.length,1,"More than expected allotments seen for user");
        let teamAllotment = allotments[0];

        await time.increaseTo(teamWalletTime+100);
        let tx = await ofinAllotment.releaseAllotment.sendTransaction( teamAllotment._name, {from: teamWallet} );

        truffleAssert.eventEmitted(tx, 'TokenReleased', (ev) => {
            return ev.vestingContract === ofinAllotment.address && ev.beneficiary===teamWallet;
        });

        let teamWalletBalance = await ofinAllotment.getTotalBalance.call({from:teamWallet});
        assert.equal(teamWalletBalance, web3.utils.toWei(teamFund, "ether"), "Incorrect Balance for user");

        allotments = await ofinAllotment.getBeneficiaryAllotments.call(teamWallet);
        assert.equal( allotments[0]._tokenCount, 0 , "Tokens have not been deducted");
    });

    it('Positive Test - Check balance of the the vesting contract', async function () {

        let ofinAllotmentBalance = await ofinAllotment.getTotalBalance.call({from:ofinAllotment.address});
        console.log(BigNumber(ofinAllotmentBalance));
        assert.equal(ofinAllotmentBalance, web3.utils.toWei(privateRoundFund, "ether"), "Incorrect Balance for vestingContract");
    
    });

    it('Positive Test - Check the balance of all wallets from erc20 contract', async function () {

        let balance = await ofin.balanceOf.call(ofinAllotment.address);
        assert.equal(balance, web3.utils.toWei(privateRoundFund, "ether"), "Incorrect Balance for vestingContract");

        balance = await ofin.balanceOf.call(stakingWallet);
        assert.equal(balance, web3.utils.toWei(stakingFund, "ether"), "Incorrect Balance for stacking wallet");

        balance = await ofin.balanceOf.call(promoWallet);
        assert.equal(balance, web3.utils.toWei(promoFund, "ether"), "Incorrect Balance for stacking wallet");

        balance = await ofin.balanceOf.call(teamWallet);
        assert.equal(balance, web3.utils.toWei(teamFund, "ether"), "Incorrect Balance for stacking wallet");

        balance = await ofin.balanceOf.call(privateRoundWallet);
        assert.equal(balance, 0, "Incorrect Balance for stacking wallet");

        balance = await ofin.balanceOf.call(admin);
        assert.equal(balance, web3.utils.toWei(releasedFund, "ether"), "Incorrect Balance for stacking wallet");

    });

    it('Positive Test - check all beneficiaries', async function () {

        let beneficiaries = await ofinAllotment.getAllBeneficiaries.call();
        assert.equal(beneficiaries.length, 4,"More than expected beneficiaries seen");

        assert.equal(stakingWallet,beneficiaries[0],"order of benefeciaries messed up");
        assert.equal(promoWallet,beneficiaries[1],"order of benefeciaries messed up");
        assert.equal(teamWallet,beneficiaries[2],"order of benefeciaries messed up");
        assert.equal(privateRoundWallet,beneficiaries[3],"order of benefeciaries messed up");       
    
    });

});