const OFINToken = artifacts.require("OFINToken");
const TokenTimelock = artifacts.require("TokenTimelock");
const BigNumber = require("bignumber.js");
const {time} = require("@openzeppelin/test-helpers");

contract("TokenTimelock Contract", async function(accounts){
    var admin = accounts[0];
    var owner = accounts[0];
    var beneficiary = accounts[1];
    var otherUser = accounts[2];

    var ofin;
    var currentTime;
    var releaseTime;
    var timelock;
    var amount =100;

    before(async function (){
        ofin = await OFINToken.new({from: admin});
        var currentBlock = await web3.eth.getBlock('latest');
        currentTime =  currentBlock.timestamp;
        releaseTime = currentTime+1000;
        timelock = await TokenTimelock.new(ofin.address, beneficiary,releaseTime);
        await ofin.mint(timelock.address, amount);
    });

    it('Negative Test - rejects a release time in the past', async function () {
        
        try {
            await TokenTimelock.new(ofin.address, beneficiary, currentTime-1000);
            assert.fail('Release time is after current time');
        } catch(error){
            assert.include(error.toString(), "TokenTimelock: release time is before current time", error.message);
        }    
    });
    

    it('Positive Test - can get state', async function () {
        assert.equal(await timelock.token(),ofin.address,"Incorrect TokenTimeLock contract creation");
        assert.equal(await timelock.beneficiary(),beneficiary,"Incorrect TokenTimeLock contract creation");
        assert.equal(BigNumber(await timelock.releaseTime()),releaseTime, "Incorrect TokenTimeLock contract creation");
        assert.equal(await timelock.isReleased(),false,"Incorrect TokenTimeLock contract creation");
    });

    it('Negative Test - cannot be released before time limit', async function () {
        try {
            await timelock.release();
            assert.fail('Able to release before release time');
        } catch(error){
            assert.include(error.toString(), "TokenTimelock: current time is before release time", error.message);
            assert.equal(await timelock.isReleased(),false,"Tokens should not be released");
        }
    });

    it('Negative Test - cannot be released just before time limit', async function () {
        try {
            await time.increaseTo(releaseTime-3);
            await timelock.release();
            assert.fail('Able to release just before release time');
        } catch(error){
            assert.include(error.toString(), "TokenTimelock: current time is before release time", error.message);
            assert.equal(await timelock.isReleased(),false,"Tokens should not be released");
        }
    });

    it('Positive Test - can be released just after limit by benficiary also', async function () {
        await time.increaseTo(releaseTime+2);
     
        await timelock.release({from: beneficiary});
        assert.equal( BigNumber(await ofin.balanceOf(beneficiary)), amount,"Balance of the beneficiary was expected to be released");
        assert.equal(await timelock.isReleased(),true,"Tokens should be released");
    });

    it('Negative Test - cannot be released twice', async function () {
        await time.increaseTo(releaseTime+100);
        try {   
            await timelock.release();
            assert.fail('Cannot double spend');
        } catch(error){
            assert.include(error.toString(), "TokenTimelock: no tokens to release", error.message);
            assert.equal(await timelock.isReleased(),true,"Tokens released already");
        }
    });

    it('Positive Test - set new release time', async function () {
        var currentBlock = await web3.eth.getBlock('latest');
        currentTime =  currentBlock.timestamp;
        releaseTime = currentTime+1000;

        timelock = await TokenTimelock.new(ofin.address, beneficiary, releaseTime);
        await ofin.mint(timelock.address, amount);

        await timelock.setIncreasedReleaseTime(releaseTime+1000);
        assert.equal(BigNumber(await timelock.releaseTime()),releaseTime+1000, "Incorrect TokenTimeLock contract creation");
    });

    it('Negative Test - set new release time lesser for already released tokens', async function () {
        try{
            await timelock.setIncreasedReleaseTime(releaseTime);
            assert.fail('Should not set new releasetime for released tokens');
        }catch(error){
            assert.include(error.toString(), "TokenTimelock: newReleaseTime should be greater than older value", error.message);
        }
        
    });

    it('Negative Test - non owner cannot increase new release time ', async function () {
        try{
            await timelock.setIncreasedReleaseTime(releaseTime+2000,{from: otherUser});
            assert.fail('Non owners should not set the new release time');
        }catch(error){
            assert.include(error.toString(), "Ownable: caller is not the owner", error.message);
        }
        
    });

    it('Negative Test - set new release time lesser than present releasetime', async function () {
        await time.increaseTo(releaseTime+2000);
        try {   
            await timelock.release();
            await timelock.setIncreasedReleaseTime(releaseTime+3000);
            assert.fail('Should not decrease releasetime');
        }catch(error){
            assert.include(error.toString(), "TokenTimelock: tokens released already", error.message);
        }
        
    });
});