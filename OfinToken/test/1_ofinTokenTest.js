var OFINToken = artifacts.require("OFINToken");

contract("Token Contract", function(accounts){
    var admin = accounts[0];
    var minter = accounts[1];
    var burner = accounts[2];
    var pauser = accounts[3];
    var roleTest = accounts[4]
    var user1 = accounts[5];
    var user2 = accounts[6];

    var ofin;

    before(async()=>{
        ofin = await OFINToken.new({from: admin});
    });

    it("Positive Test - Create ofin token contract", async()=> {
        assert.equal(await ofin.decimals(), 18, "Contract creation is incorrect");
    });

    it("Positive Test - Add minter grantRole", async()=> {
        const role = await ofin.MINTER_ROLE();

        const result = await ofin.grantRole(role, minter);
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "RoleGranted",
            "RoleGranted event should be fired"
          );
    });

    it("Positive Test - Add minter grantMinterRole", async()=> {
        const result = await ofin.grantMinterRole(roleTest);
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "RoleGranted",
            "RoleGranted event should be fired"
          );
    });

    it("Positive Test - Add burner grantRole", async()=> {
        const role = await ofin.BURNER_ROLE();

        const result = await ofin.grantRole(role, burner);
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "RoleGranted",
            "RoleGranted event should be fired"
          );
    });

    it("Positive Test - Add burner grantBurnerRole", async()=> {
        const result = await ofin.grantBurnerRole(roleTest);
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "RoleGranted",
            "RoleGranted event should be fired"
          );
    });

    it("Positive Test - Add pauser grantPauserRole", async()=> {
        const role = await ofin.PAUSER_ROLE();

        const result = await ofin.grantPauserRole(pauser);
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "RoleGranted",
            "RoleGranted event should be fired"
          );
    });

    it("Positive Test - Mint some tokens using minter", async()=> {
        const result = await ofin.mint(user1, web3.utils.toWei("1", "ether"), {from: minter});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Positive Test - Mint some tokens using admin", async()=> {
        const result = await ofin.mint(user1, web3.utils.toWei("1", "ether"), {from: admin});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Positive Test - Admin can mint tokens to self", async()=> {
        const result = await ofin.mint(admin, web3.utils.toWei("1", "ether"), {from: admin});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Positive Test - Minter can mint tokens to self", async()=> {
        const result = await ofin.mint(minter, web3.utils.toWei("1", "ether"), {from: minter});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Negative Test - Non-minter cannot mint tokens to others", async()=> {
        try {
            await ofin.mint(user1, web3.utils.toWei("1", "ether"), {from: user2});
            assert.equal(true, false, "Non-minter can mint tokens");
        } catch (error) {
            assert.include(error.toString(), "must have minter role to mint", error.message);
        }
    });

    it("Negative Test - Non-minter cannot mint tokens to self", async()=> {
        try {
            await ofin.mint(user1, web3.utils.toWei("1", "ether"), {from: user1});
            assert.equal(true, false, "Non-minter can mint tokens to others");
        } catch (error) {
            assert.include(error.toString(), "must have minter role to mint", error.message);
        }
    });

    it("Negative Test - Burn tokens without allowance/approval", async()=> {
        try {
            await ofin.burnFrom(user1, web3.utils.toWei("1", "ether"), {from: burner});
            assert(true, false, "Burn without allowance");
        } catch (error) {
            assert.include(error.toString(), "burn amount exceeds allowance", error.message);
        }
    });

    it("Positive Test - Approve tokens", async()=> {
        const result = await ofin.approve(burner, web3.utils.toWei("1", "ether"), {from: user1});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Approval",
            "Approval event should be fired"
          );
    });

    it("Positive Test - Burn tokens with allowance/approval", async()=> {
        const result = await ofin.burnFrom(user1, web3.utils.toWei("1", "ether"), {from: burner});
        var approvalEvent = result.logs[0].event;
        var transferEvent = result.logs[1].event;

        assert.equal(
            approvalEvent,
            "Approval",
            "Approval event should be fired"
          );
    
        assert.equal(
            transferEvent,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Positive Test - Burn own tokens", async()=> {
        await ofin.mint(user1, web3.utils.toWei("1", "ether"), {from: minter});

        const result = await ofin.burn(web3.utils.toWei("1", "ether"), {from: user1});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Positive Test - Pause the contract", async()=> {
        const result = await ofin.pause({from: pauser});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Paused",
            "Paused event should be fired"
          );
    });

    it("Positive Test - Mint some tokens when paused", async()=> {
        var result;
        result = await ofin.mint(user1, web3.utils.toWei("1", "ether"), {from: minter});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Positive Test - burn tokens when paused", async()=> {
        await ofin.mint(user1, web3.utils.toWei("1", "ether"), {from: minter});

        const result = await ofin.burn(web3.utils.toWei("1", "ether"), {from: user1});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Transfer",
            "Transfer event should be fired"
          );
    });

    it("Negative Test - Transfer tokens when paused", async()=> {
        try {
            await ofin.transfer(user2, web3.utils.toWei("1", "ether"), {from: user1});
            assert.fail("Transfer during pause");
        } catch (error) {
            assert.include(error.toString(), "ERC20Pausable: token transfer while paused", error.message);
        }
    });

    it("Positive Test - UnPause the contract using pauser", async()=> {
        const result = await ofin.unpause({from: pauser});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Unpaused",
            "Unpaused event should be fired"
          );
    });

    it("Positive Test - Pause the contract using admin", async()=> {
        await ofin.pause({from: admin});

        const result = await ofin.unpause({from: admin});
        var event = result.logs[0].event;
    
        assert.equal(
            event,
            "Unpaused",
            "Unpaused event should be fired"
          );
    });

    it("Negative Test - Minter more than max supply", async()=> {
        var maxSupply = await ofin.cap();

        try {
            await ofin.mint(admin, maxSupply, {from: minter});
            assert.equal(true, false, "Minter can mint tokens more than token supply");
        } catch (error) {
            assert.include(error.toString(), "ERC20Capped: cap exceeded.", error.message);
        }
    });
});