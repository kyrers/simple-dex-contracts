import hre from "hardhat";
import TokenAModule from "../ignition/modules/TokenA";
import TokenBModule from "../ignition/modules/TokenB";
import SimpleDexModule from "../ignition/modules/SimpleDex";

async function main() {
  const [owner] = await hre.viem.getWalletClients();
  console.log("OWNER:", owner.account.address);

  const { tokenA } = await hre.ignition.deploy(TokenAModule, {
    parameters: {
      TokenAModule: { initialOwner: owner.account.address },
    },
  });
  console.log("Token A deployed to:", tokenA.address);

  const { tokenB } = await hre.ignition.deploy(TokenBModule, {
    parameters: {
      TokenBModule: { initialOwner: owner.account.address },
    },
  });
  console.log("Token B deployed to:", tokenB.address);

  const { simpleDex } = await hre.ignition.deploy(SimpleDexModule, {
    parameters: {
      SimpleDexModule: {
        tokenAAddress: tokenA.address,
        tokenBAddress: tokenB.address,
      },
    },
  });
  console.log("SimpleDex deployed to:", simpleDex.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
