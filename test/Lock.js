const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const BN = require("bn.js");

const minute30 = 60 * 30;
const minute = 60;
function increase(duration) {
  return time.increase(duration);
}

describe("Lock", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployment() {
    const signers = await ethers.getSigners();

    owner = signers[0];
    users = signers.slice(1);
    userDrop = users[10];

    const USDT = await ethers.getContractFactory("USDT");
    const usdt = await USDT.deploy();

    const LP = await ethers.getContractFactory("LP");
    const lp = await LP.deploy();

    const Unipool = await ethers.getContractFactory("Unipool");
    const unipool = await Unipool.deploy(usdt.address, lp.address);

    for (let i = 0; i < users.length; i++) {
      // await usdt.transfer(users[i].address, ethers.utils.parseEther("1000"));
      await lp.transfer(users[i].address, ethers.utils.parseEther("1000"));

      await lp
        .connect(users[i])
        .approve(unipool.address, ethers.utils.parseEther("1000"));
    }

    await usdt.transfer(unipool.address, ethers.utils.parseEther("10"));
    await usdt.transfer(users[10].address, ethers.utils.parseEther("10"));

    return { usdt, lp, unipool, owner, users, userDrop };
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
    it("两个人都投入10LP，并在结束的时候赎回", async function () {
      const { unipool, lp, users, usdt } = await loadFixture(deployment);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("10"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("10"));

      await increase(minute30);

      await unipool.connect(users[1]).getReward();
      await unipool.connect(users[0]).getReward();

      const balUSDT = await usdt.balanceOf(users[1].address);
      const balUSDT2 = await usdt.balanceOf(users[0].address);
      const balUSDT3 = await usdt.balanceOf(owner.address);

      console.log(
        "========= 两个人都投入10LP，并在结束的时候赎回 ============"
      );
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");
      await expect(lp.balanceOf(unipool.address)).to.eventually.equal(
        ethers.utils.parseEther("20")
      );
    });
    it("两个人都投入10LP，并在不同时间领取", async function () {
      const { unipool, lp, users, usdt } = await loadFixture(deployment);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("10"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("10"));

      await increase(minute * 10);

      await unipool.connect(users[0]).getReward();
      await unipool.connect(users[1]).getReward();

      await increase(minute * 10);

      await unipool.connect(users[0]).getReward();

      await increase(minute * 10);
      await unipool.connect(users[0]).getReward();
      await unipool.connect(users[1]).getReward();

      const balUSDT = await usdt.balanceOf(users[1].address);
      const balUSDT2 = await usdt.balanceOf(users[0].address);
      const balUSDT3 = await usdt.balanceOf(owner.address);

      console.log("========= 两个人都投入10LP，并在不同时间领取 ============");
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");
      await expect(lp.balanceOf(unipool.address)).to.eventually.equal(
        ethers.utils.parseEther("20")
      );
    });
    it("两个人都投入10LP，并在不同时间领取，其中一个人提前退出", async function () {
      const { unipool, lp, users, usdt } = await loadFixture(deployment);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("10"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("10"));

      await increase(minute * 10);

      await unipool.connect(users[0]).getReward();
      // await unipool.connect(users[1]).getReward();
      await unipool.connect(users[1]).exit();

      await increase(minute * 10);

      await unipool.connect(users[0]).getReward();

      await increase(minute * 10);
      await unipool.connect(users[0]).getReward();

      const balUSDT = await usdt.balanceOf(users[1].address);
      const balUSDT2 = await usdt.balanceOf(users[0].address);
      const balUSDT3 = await usdt.balanceOf(owner.address);

      console.log(
        "========= 两个人都投入10LP，并在不同时间领取，其中一个人提前退出 ============"
      );
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");
      await expect(lp.balanceOf(unipool.address)).to.eventually.equal(
        ethers.utils.parseEther("10")
      );
    });
    it("两个人都投入10LP，并在不同时间领取，其中一个人提前退出，另一个人在结束的时候领取", async function () {
      const { unipool, lp, users, usdt } = await loadFixture(deployment);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("10"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("10"));

      await increase(minute * 10);
      await unipool.connect(users[1]).exit();

      await increase(minute * 10);
      await increase(minute * 10);

      await unipool.connect(users[0]).exit();

      const balUSDT = await usdt.balanceOf(users[1].address);
      const balUSDT2 = await usdt.balanceOf(users[0].address);
      const balUSDT3 = await usdt.balanceOf(owner.address);

      console.log(
        "========= 两个人都投入10LP，并在不同时间领取，其中一个人提前退出，另一个人在结束的时候领取 ============"
      );
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");
      await expect(lp.balanceOf(unipool.address)).to.eventually.equal(
        ethers.utils.parseEther("0")
      );
    });

    it("两个人在过程中不断投入LP", async function () {
      const { unipool, lp, users, usdt } = await loadFixture(deployment);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("1"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("3"));

      await increase(minute * 10);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("2"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("3"));

      await increase(minute * 10);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("3"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("1"));

      await increase(minute * 10);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("4"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("2"));

      await increase(minute * 10);

      await unipool.connect(users[0]).exit();
      await unipool.connect(users[1]).exit();

      const balUSDT = await usdt.balanceOf(users[1].address);
      const balUSDT2 = await usdt.balanceOf(users[0].address);
      const balUSDT3 = await usdt.balanceOf(owner.address);

      console.log("========= 两个人在过程中不断投入LP ============");
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");
    });
    it("两个人在过程中不断投入LP，过程中仍有奖励在掉落", async function () {
      const { unipool, lp, users, usdt, userDrop } = await loadFixture(
        deployment
      );

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("1"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("3"));

      await increase(minute * 10);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("2"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("3"));

      await increase(minute * 10);

      await usdt
        .connect(userDrop)
        .transfer(unipool.address, ethers.utils.parseEther("5"));
      await unipool.connect(users[0]).stake(ethers.utils.parseEther("3"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("1"));

      await increase(minute * 10);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("4"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("2"));

      await increase(minute * 10);

      await unipool.connect(users[0]).exit();
      await unipool.connect(users[1]).exit();

      var balUSDT = await usdt.balanceOf(users[1].address);
      var balUSDT2 = await usdt.balanceOf(users[0].address);
      var balUSDT3 = await usdt.balanceOf(owner.address);

      console.log(
        "========= 两个人在过程中不断投入LP，过程中仍有奖励在掉落 ============"
      );
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");

      await increase(minute * 30);

      var balUSDT = await usdt.balanceOf(users[1].address);
      var balUSDT2 = await usdt.balanceOf(users[0].address);
      var balUSDT3 = await usdt.balanceOf(owner.address);

      console.log(
        "========= 两个人在过程中不断投入LP，过程中仍有奖励在掉落 ============"
      );
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");
    });
    it("两个人在过程中不断投入LP，过程中仍有奖励在掉落", async function () {
      const { unipool, lp, users, usdt, userDrop } = await loadFixture(
        deployment
      );

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("1"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("3"));

      await increase(minute * 10);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("2"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("3"));

      await increase(minute * 10);

      await usdt
        .connect(userDrop)
        .transfer(unipool.address, ethers.utils.parseEther("5"));
      await unipool.connect(users[0]).stake(ethers.utils.parseEther("3"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("1"));

      await increase(minute * 10);

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("4"));
      await unipool.connect(users[1]).stake(ethers.utils.parseEther("2"));

      await increase(minute * 10);

      await unipool.connect(users[0]).exit();
      await unipool.connect(users[1]).exit();

      var balUSDT = await usdt.balanceOf(users[1].address);
      var balUSDT2 = await usdt.balanceOf(users[0].address);
      var balUSDT3 = await usdt.balanceOf(owner.address);

      console.log(
        "========= 两个人在过程中不断投入LP，过程中仍有奖励在掉落 ============"
      );
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });

      console.log("=======================================================");

      await unipool.connect(users[0]).stake(ethers.utils.parseEther("4"));
      await increase(minute * 30);

      await usdt
      .connect(userDrop)
      .transfer(unipool.address, ethers.utils.parseEther("5"));

      await unipool.connect(users[0]).getReward();
      await unipool.connect(users[1]).getReward();

      var balUSDT = await usdt.balanceOf(users[1].address);
      var balUSDT2 = await usdt.balanceOf(users[0].address);
      var balUSDT3 = await usdt.balanceOf(owner.address);

      console.log(
        "========= 两个人在过程中不断投入LP，过程中仍有奖励在掉落 ============"
      );
      console.table({
        balUSDT: balUSDT.toString(),
        balUSDT2: balUSDT2.toString(),
        balUSDT3: balUSDT3.toString(),
      });
      console.log("=======================================================");
    });
  });
});
