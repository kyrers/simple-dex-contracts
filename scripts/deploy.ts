import hre from "hardhat";
import TokenAModule from "../ignition/modules/TokenAModule";
import TokenBModule from "../ignition/modules/TokenBModule";
import SimpleDexModule from "../ignition/modules/SimpleDexModule";

async function main() {
  const { tokenA } = await hre.ignition.deploy(TokenAModule);
  console.log("Token A deployed to:", tokenA.target.toString());

  const { tokenB } = await hre.ignition.deploy(TokenBModule);
  console.log("Token B deployed to:", tokenB.target.toString());

  const { simpleDex } = await hre.ignition.deploy(SimpleDexModule, {
    parameters: {
      SimpleDexModule: {
        tokenAAddress: tokenA.target.toString(),
        tokenBAddress: tokenB.target.toString(),
      },
    },
  });
  console.log("SimpleDex deployed to:", simpleDex.target.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
