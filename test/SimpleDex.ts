import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre, { ignition } from "hardhat";
import { getAddress, zeroAddress } from "viem";
import TokenAModule from "../ignition/modules/TokenAModule";
import TokenBModule from "../ignition/modules/TokenBModule";
import SimpleDexModule from "../ignition/modules/SimpleDexModule";

describe("SimpleDex", function () {
  async function deploySimpleDexFixture() {
    const [owner, otherAccount] = await hre.viem.getWalletClients();

    const { tokenA } = await ignition.deploy(TokenAModule, {
      parameters: {
        TokenAModule: { initialOwner: owner.account.address },
      },
    });

    const { tokenB } = await ignition.deploy(TokenBModule, {
      parameters: {
        TokenBModule: { initialOwner: owner.account.address },
      },
    });

    const { simpleDex } = await hre.ignition.deploy(SimpleDexModule, {
      parameters: {
        SimpleDexModule: {
          tokenAAddress: tokenA.address,
          tokenBAddress: tokenB.address,
        },
      },
    });

    const publicClient = await hre.viem.getPublicClient();

    return {
      tokenA,
      tokenB,
      simpleDex,
      owner,
      otherAccount,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should deploy TokenA and TokenB with the correct owner", async function () {
      const { tokenA, tokenB, owner } = await loadFixture(
        deploySimpleDexFixture
      );

      expect(await tokenA.read.owner()).to.equal(
        getAddress(owner.account.address)
      );
      expect(await tokenB.read.owner()).to.equal(
        getAddress(owner.account.address)
      );
    });

    it("Should deploy the SimpleDex with the right token addresses", async function () {
      const { tokenA, tokenB, simpleDex } = await loadFixture(
        deploySimpleDexFixture
      );

      expect(await simpleDex.read.tokenA()).to.equal(
        getAddress(tokenA.address)
      );
      expect(await simpleDex.read.tokenB()).to.equal(
        getAddress(tokenB.address)
      );
    });

    it("Should fail to deploy tokens because no owner address is provided", async function () {
      await expect(ignition.deploy(TokenAModule)).to.be.rejected;
      await expect(ignition.deploy(TokenBModule)).to.be.rejected;
    });

    it("Should fail to deploy the simple DEX because no token addresses are provided", async function () {
      await expect(ignition.deploy(SimpleDexModule)).to.be.rejected;
    });

    it("Should fail to deploy the simple DEX because only TokenA address is provided", async function () {
      await expect(
        ignition.deploy(SimpleDexModule, {
          parameters: {
            SimpleDexModule: {
              tokenAAddress: "0x",
            },
          },
        })
      ).to.be.rejected;
    });

    it("Should fail to deploy the simple DEX because only TokenB address is provided", async function () {
      await expect(
        ignition.deploy(SimpleDexModule, {
          parameters: {
            SimpleDexModule: {
              tokenBAddress: "0x",
            },
          },
        })
      ).to.be.rejected;
    });

    it("Should fail to deploy the simple DEX because address 0 is not a valid address", async function () {
      await expect(
        ignition.deploy(SimpleDexModule, {
          parameters: {
            SimpleDexModule: {
              tokenAAddress: zeroAddress,
              tokenBAddress: zeroAddress,
            },
          },
        })
      ).to.be.rejectedWith(
        `InvalidTokenAddress("${zeroAddress}", "${zeroAddress}")`
      );
    });
  });
});
