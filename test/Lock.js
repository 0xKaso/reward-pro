const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployment() {
    const signers = await ethers.getSigners();

    owner = signers[0];
    users = signers.slice(1);

    const USDT = await ethers.getContractFactory("USDT");
    const usdt = await USDT.deploy();

    const LP = await ethers.getContractFactory("LP");
    const lp = await LP.deploy();

    const Unipool = await ethers.getContractFactory("Unipool");
    const unipool = await Unipool.deploy(usdt.address, lp.address);

    for (let i = 0; i < users.length; i++) {
      await usdt.transfer(users[i].address, ethers.utils.parseEther("1000"));
      await lp.transfer(users[i].address, ethers.utils.parseEther("1000"));

      await lp
        .connect(users[i])
        .approve(unipool.address, ethers.utils.parseEther("1000"));
    }

    await usdt.transfer(unipool.address, ethers.utils.parseEther("10"));

    return { usdt, lp, unipool, owner, users };
  }

  describe("Deployment", function () {
    it("should have the right lp token address and reward token address", async function () {
      const { usdt, lp, unipool } = await loadFixture(deployment);

      await expect(unipool.rewardToken()).to.eventually.equal(usdt.address);
      await expect(unipool.lpToken()).to.eventually.equal(lp.address);
    });
    it("should have 10 ether in the reward pool", async function () {
      const { unipool, usdt } = await loadFixture(deployment);

      await expect(usdt.balanceOf(unipool.address)).to.eventually.equal(
        ethers.utils.parseEther("10")
      );
    });
  });

  describe("Staking", function () {
    it("should have 10 lp token in the pool", async function () {
      const { unipool, lp, users } = await loadFixture(deployment);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("10"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("10"));

      var rewardPerTokenStored = await unipool.rewardPerTokenStored()
      console.log("rewardPerTokenStored",rewardPerTokenStored.toString())
      var rewardPerToken = await unipool.rewardPerToken()
      console.log("rewardPerToken",rewardPerToken.toString())
      var lastUpdateTime = await unipool.lastUpdateTime()
      console.log("lastUpdateTime",lastUpdateTime.toString())
      await unipool.connect(users[0]).getReward();
      
      var rewardPerTokenStored = await unipool.rewardPerTokenStored()
      console.log("rewardPerTokenStored",rewardPerTokenStored.toString())
      var rewardPerToken = await unipool.rewardPerToken()
      console.log("rewardPerToken",rewardPerToken.toString())
      var lastUpdateTime = await unipool.lastUpdateTime()
      console.log("lastUpdateTime",lastUpdateTime.toString())
      await unipool.connect(users[1]).getReward();
 
      var periodFinish = await unipool.periodFinish()

      

    

      await expect(lp.balanceOf(unipool.address)).to.eventually.equal(
        ethers.utils.parseEther("20")
      );
    });
  });
});
